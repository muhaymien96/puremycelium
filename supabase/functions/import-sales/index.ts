/// <reference lib="deno.window" />
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
  eventSelections?: Record<string, string>; // date (YYYY-MM-DD) -> event_id
  saveProductMappings?: boolean;
}

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Builds a deterministic key per transaction to prevent duplicate imports. Includes timestamp (rounded to seconds),
// total amount, and a sorted signature of all items (sku, quantity, prices) so identical carts are treated as duplicates.
const buildExternalKey = (group: TransactionGroup, timestamp: Date) => {
  const roundedTimestamp = new Date(Math.floor(timestamp.getTime() / 1000) * 1000);
  const itemsSignature = [...group.items]
    .map((item) => `${item.productSku}|${item.quantity}|${item.unitPrice.toFixed(2)}|${item.lineTotal.toFixed(2)}`)
    .sort()
    .join('||');

  const externalKey = `yoco_import|${roundedTimestamp.toISOString()}|${group.totalAmount.toFixed(2)}|${itemsSignature}`;
  const legacyKey = `yoco_import|${roundedTimestamp.toISOString()}|${group.totalAmount.toFixed(2)}|${group.firstSku}`;

  return { externalKey, legacyKey, roundedTimestamp };
};

serve(async (req: Request) => {
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
    const { groups, fileName, startDate, endDate, productMappings = {}, eventSelections = {}, saveProductMappings = false } = payload;

    if (!groups || groups.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No transaction groups provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Derive date window from transactions when UI start/end are empty strings
    const txTimestamps = groups.map((g) => new Date(g.timestamp).getTime()).filter((t) => !Number.isNaN(t));
    const minTs = Math.min(...txTimestamps);
    const maxTs = Math.max(...txTimestamps);
    const derivedStartDate = startDate && startDate.trim() !== '' ? startDate : toDateKey(new Date(minTs));
    const derivedEndDate = endDate && endDate.trim() !== '' ? endDate : toDateKey(new Date(maxTs));
    const batchStartDate = derivedStartDate;
    const batchEndDate = derivedEndDate;

    console.log(`Starting import: ${groups.length} groups, fileName: ${fileName}`);
    console.log(`Event selections provided:`, eventSelections);
    console.log(`Product mappings provided:`, Object.keys(productMappings).length);

    // Create import batch record
    const { data: importBatch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        file_name: fileName,
        start_date: batchStartDate,
        end_date: batchEndDate,
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
      .lte('event_date', derivedEndDate)
      .or(`end_date.gte.${derivedStartDate},end_date.is.null`);

    const { data: eventDays } = await supabase
      .from('event_days')
      .select('event_id, day_date')
      .gte('day_date', derivedStartDate)
      .lte('day_date', derivedEndDate);

    const eventDayMap = new Map<string, string[]>();
    (eventDays || []).forEach((ed: any) => {
      const existing = eventDayMap.get(ed.day_date) || [];
      existing.push(ed.event_id);
      eventDayMap.set(ed.day_date, existing);
    });

    // Build date-matching functions for multi-day events
    // Event matches if transaction date falls within [event_date, end_date] range
    const findEventForDate = (txDate: string): string | null => {
      // First check user-selected event for this date
      if (eventSelections[txDate]) {
        console.log(`Using user selection for ${txDate}: ${eventSelections[txDate]}`);
        return eventSelections[txDate];
      }

      const dayMatchedEvents = eventDayMap.get(txDate);
      if (dayMatchedEvents && dayMatchedEvents.length > 0) {
        console.log(`Using event_days match for ${txDate}: ${dayMatchedEvents[0]}`);
        return dayMatchedEvents[0];
      }

      if (!eventsInRange) return null;
      
      for (const event of eventsInRange) {
        const eventStart = event.event_date;
        const eventEnd = event.end_date || event.event_date;
        
        // Check if txDate falls within the event range
        if (txDate >= eventStart && txDate <= eventEnd) {
          console.log(`Using range match for ${txDate}: ${event.id}`);
          return event.id;
        }
      }
      console.log(`No event match for ${txDate}`);
      return null;
    };

    console.log(`Found ${eventsInRange?.length || 0} market events in date range for auto-linking`);

    // Load existing product mappings from database
    const { data: savedMappings } = await supabase
      .from('product_mappings')
      .select('external_sku, product_id')
      .eq('source', 'yoco_import');

    const dbMappings: Record<string, string> = {};
    (savedMappings || []).forEach((m: any) => {
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
      (allProducts || []).map((p: any) => [p.sku, p])
    );
    
    // Also create a map by ID for quick lookup
    const productById = new Map(
      (allProducts || []).map((p: any) => [p.id, p])
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
        const timestamp = new Date(group.timestamp);
        const { externalKey, legacyKey, roundedTimestamp } = buildExternalKey(group, timestamp);

        // Primary duplicate check: external_transaction_key (new deterministic key + legacy key)
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .in('external_transaction_key', [externalKey, legacyKey])
          .limit(1)
          .maybeSingle();

        // Fallback duplicate check: match on transaction_datetime and total_amount in case prior runs did not set external_transaction_key
        let existingByTimestamp = null;
        if (!existing) {
          const { data: existingTs } = await supabase
            .from('orders')
            .select('id')
            .eq('transaction_datetime', roundedTimestamp.toISOString())
            .eq('total_amount', group.totalAmount)
            .limit(1)
            .maybeSingle();
          existingByTimestamp = existingTs;
        }

        if (existing || existingByTimestamp) {
          skippedDuplicates++;
          console.log(`Skipped duplicate transaction at ${timestamp.toISOString()} with key ${externalKey}`);
          continue;
        }

        const txDate = toDateKey(timestamp);
        const matchedEventId = findEventForDate(txDate);

        if (matchedEventId) {
          autoLinkedEvents++;
          console.log(`Transaction on ${txDate} linked to event ${matchedEventId}`);
        } else {
          console.log(`Transaction on ${txDate} has no matching event`);
        }

        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

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

        let totalCost = 0;
        for (const item of group.items) {
          let productId = finalMappings[item.productSku];
          let product: any = productId ? productById.get(productId) : null;

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

          let costPerUnit = 0;
          let batchId = null;

          if (product?.id) {
            const { data: availableBatch } = await supabase
              .from('product_batches')
              .select('id, quantity')
              .eq('product_id', product.id)
              .gt('quantity', 0)
              .order('production_date', { ascending: true })
              .limit(1)
              .maybeSingle();

            const productCost = product?.cost_price;
            const estimatedCost = item.unitPrice * 0.6;
            costPerUnit = Number(productCost || estimatedCost || 0);

            if (availableBatch && availableBatch.quantity >= item.quantity) {
              batchId = availableBatch.id;
              const { error: batchDecError } = await supabase.rpc('decrement_batch_quantity', {
                p_batch_id: availableBatch.id,
                p_quantity: item.quantity,
              });

              if (batchDecError) {
                console.error('Failed to decrement batch quantity:', batchDecError);
              }
            } else {
              console.warn(`No batch with sufficient stock for product ${product.id}, SKU: ${product.sku}`);
            }

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

    console.log(`Import complete: ${newOrders} new, ${skippedDuplicates} skipped, ${totalItems} items, ${unmatchedProducts} unmatched, ${autoLinkedEvents} auto-linked to events`);

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
