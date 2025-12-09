import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransactionGroup {
  timestamp: string;
  items: Array<{
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  totalAmount: number;
  firstSku: string;
}

interface ImportPayload {
  groups: TransactionGroup[];
  startDate: string;
  endDate: string;
  fileName?: string;
  productMappings?: Record<string, string>; // external_sku -> product_id
  saveProductMappings?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is admin
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: ImportPayload = await req.json();
    const { groups, fileName, productMappings = {}, saveProductMappings = false } = payload;

    console.log(`Starting import: ${groups.length} groups, fileName: ${fileName}`);

    // Create import batch record
    const { data: importBatch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        file_name: fileName,
        start_date: payload.startDate,
        end_date: payload.endDate,
        status: 'processing',
        created_by: user.id,
      })
      .select()
      .single();

    if (batchError) {
      console.error('Failed to create import batch:', batchError);
      throw batchError;
    }

    console.log(`Created import batch: ${importBatch.id}`);

    // Fetch market events for auto-linking by transaction date
    const { data: eventsInRange } = await supabase
      .from('market_events')
      .select('id, event_date, end_date, name')
      .lte('event_date', payload.endDate)
      .or(`end_date.gte.${payload.startDate},end_date.is.null`);

    // Build date-matching functions for multi-day events
    // Event matches if transaction date falls within [event_date, end_date] range
    const findEventForDate = (txDate: string): string | null => {
      if (!eventsInRange) return null;
      
      for (const event of eventsInRange) {
        const eventStart = event.event_date;
        const eventEnd = event.end_date || event.event_date;
        
        // Check if txDate falls within the event range
        if (txDate >= eventStart && txDate <= eventEnd) {
          return event.id;
        }
      }
      return null;
    };

    console.log(`Found ${eventsInRange?.length || 0} market events in date range for auto-linking`);

    // Load existing product mappings from database
    const { data: savedMappings } = await supabase
      .from('product_mappings')
      .select('external_sku, product_id')
      .eq('source', 'yoco_import');

    const dbMappings: Record<string, string> = {};
    (savedMappings || []).forEach(m => {
      if (m.product_id) {
        dbMappings[m.external_sku] = m.product_id;
      }
    });

    console.log(`Loaded ${Object.keys(dbMappings).length} saved mappings from database`);

    // Merge: user-provided mappings override saved mappings
    const finalMappings = { ...dbMappings, ...productMappings };

    // Get all products for matching (include cost_price for cost calculation)
    const { data: allProducts } = await supabase
      .from('products')
      .select('id, sku, name, unit_price, cost_price, total_stock')
      .eq('is_active', true);

    const productMap = new Map(
      (allProducts || []).map(p => [p.sku, p])
    );
    
    // Also create a map by ID for quick lookup
    const productById = new Map(
      (allProducts || []).map(p => [p.id, p])
    );

    let newOrders = 0;
    let skippedDuplicates = 0;
    let totalItems = 0;
    let unmatchedProducts = 0;
    let autoLinkedEvents = 0;
    const errors: string[] = [];
    const unmatchedSkus = new Set<string>();

    for (const group of groups as TransactionGroup[]) {
      try {
        // Generate external transaction key
        const timestamp = new Date(group.timestamp);
        const roundedTimestamp = new Date(Math.floor(timestamp.getTime() / 1000) * 1000);
        const externalKey = `yoco_import|${roundedTimestamp.toISOString()}|${group.totalAmount.toFixed(2)}|${group.firstSku}`;

        // Check if already exists
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('external_transaction_key', externalKey)
          .maybeSingle();

        if (existing) {
          skippedDuplicates++;
          continue;
        }

        // Auto-link to market event by transaction date (supports multi-day events)
        const txDate = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
        const matchedEventId = findEventForDate(txDate);
        
        if (matchedEventId) {
          autoLinkedEvents++;
        }

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create order with import_batch_id and auto-linked market_event_id
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            customer_id: null,
            market_event_id: matchedEventId,
            total_amount: group.totalAmount,
            status: 'delivered',
            external_source: 'yoco_import',
            external_transaction_key: externalKey,
            transaction_datetime: timestamp.toISOString(),
            created_at: timestamp.toISOString(),
            import_batch_id: importBatch.id,
            created_by: user.id,
            notes: matchedEventId ? 'Imported from Yoco terminal (auto-linked to market event)' : 'Imported from Yoco terminal',
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        let totalCost = 0;
        for (const item of group.items) {
          // Try to find product: first by mapping, then by direct SKU match
          let productId = finalMappings[item.productSku];
          let product = productId ? productById.get(productId) : null;
          
          // If not found by mapping, try direct SKU match
          if (!product) {
            product = productMap.get(item.productSku);
          }

          if (!product) {
            unmatchedSkus.add(item.productSku);
          }
          
          const { error: itemError } = await supabase
            .from('order_items')
            .insert({
              order_id: order.id,
              product_id: product?.id || null,
              product_name: item.productName,
              product_sku: item.productSku,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              subtotal: item.lineTotal,
            });

          if (itemError) throw itemError;

          // Calculate cost with fallback chain: product cost → estimated (60% of unit price)
          let costPerUnit = 0;
          let batchId = null;

          if (product?.id) {
            // Find oldest batch with available stock (FIFO)
            const { data: availableBatch } = await supabase
              .from('product_batches')
              .select('id, quantity')
              .eq('product_id', product.id)
              .gt('quantity', 0)
              .order('production_date', { ascending: true })
              .limit(1)
              .maybeSingle();

            // Cost fallback chain: product.cost_price → item.unitPrice * 0.6
            const productCost = product?.cost_price;
            const estimatedCost = item.unitPrice * 0.6;
            costPerUnit = Number(productCost || estimatedCost || 0);

            if (availableBatch && availableBatch.quantity >= item.quantity) {
              batchId = availableBatch.id;
              // Decrement batch quantity (this will trigger total_stock recalculation)
              const { error: batchDecError } = await supabase.rpc('decrement_batch_quantity', {
                p_batch_id: availableBatch.id,
                p_quantity: item.quantity
              });

              if (batchDecError) {
                console.error('Failed to decrement batch quantity:', batchDecError);
              }
            } else {
              console.warn(`No batch with sufficient stock for product ${product.id}, SKU: ${product.sku}`);
            }

            // Create stock movement record
            const { error: stockError } = await supabase
              .from('stock_movements')
              .insert({
                product_id: product.id,
                batch_id: batchId,
                movement_type: 'sale',
                quantity: -item.quantity,
                reference_type: 'order',
                reference_id: order.id,
                notes: 'Imported sale from Yoco terminal',
                created_by: user.id,
              });

            if (stockError) {
              console.error('Failed to create stock movement:', stockError);
            }
          } else {
            // For unmatched products, use estimated cost (60% of unit price)
            costPerUnit = item.unitPrice * 0.6;
          }

          totalCost += costPerUnit * item.quantity;
          totalItems++;
        }

        // Create payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            order_id: order.id,
            amount: group.totalAmount,
            payment_method: 'YOCO_TERMINAL',
            payment_status: 'completed',
            transaction_date: timestamp.toISOString(),
            created_by: user.id,
            notes: 'Imported from Yoco terminal',
          });

        if (paymentError) throw paymentError;

        // Create financial transaction with calculated cost
        const profit = group.totalAmount - totalCost;
        const { error: financialError } = await supabase
          .from('financial_transactions')
          .insert({
            order_id: order.id,
            transaction_type: 'sale',
            amount: group.totalAmount,
            cost: totalCost,
            profit: profit,
            payment_method: 'YOCO_TERMINAL',
            notes: matchedEventId ? 'Imported from Yoco terminal (auto-linked to event)' : 'Imported from Yoco terminal',
            transaction_at: timestamp.toISOString(),
          });

        if (financialError) throw financialError;

        newOrders++;
      } catch (error) {
        console.error('Error processing group:', error);
        errors.push(`Transaction at ${group.timestamp}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    unmatchedProducts = unmatchedSkus.size;

    // Save new product mappings if requested
    if (saveProductMappings && Object.keys(productMappings).length > 0) {
      const mappingsToSave = Object.entries(productMappings).map(([sku, productId]) => ({
        external_sku: sku,
        product_id: productId,
        source: 'yoco_import',
        created_by: user.id,
      }));

      const { error: mappingError } = await supabase
        .from('product_mappings')
        .upsert(mappingsToSave, { onConflict: 'external_sku,source' });

      if (mappingError) {
        console.error('Failed to save product mappings:', mappingError);
      } else {
        console.log(`Saved ${mappingsToSave.length} product mappings`);
      }
    }

    // Update import batch with final statistics
    const { error: updateError } = await supabase
      .from('import_batches')
      .update({
        orders_created: newOrders,
        orders_skipped: skippedDuplicates,
        items_imported: totalItems,
        unmatched_products: unmatchedProducts,
        status: errors.length > 0 ? 'completed_with_errors' : 'completed',
        errors: errors.length > 0 ? errors : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', importBatch.id);

    if (updateError) {
      console.error('Failed to update import batch:', updateError);
    }

    console.log(`Import complete: ${newOrders} new, ${skippedDuplicates} skipped, ${totalItems} items, ${unmatchedProducts} unmatched, ${autoLinkedEvents} auto-linked to events`);

    return new Response(
      JSON.stringify({
        newOrders,
        skippedDuplicates,
        totalItems,
        unmatchedProducts,
        autoLinkedEvents,
        importBatchId: importBatch.id,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
