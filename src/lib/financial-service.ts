import { supabase } from '@/integrations/supabase/client';

export interface FinancialTransaction {
  id?: string;
  order_id: string;
  transaction_type: 'sale' | 'refund' | 'adjustment';
  amount: number;
  cost: number;
  profit: number;
  payment_method?: string;
  notes?: string;
  created_at?: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  salesCount: number;
  refundsCount: number;
  refundedAmount: number;
  netRevenue: number;
  netProfit: number;
  profitMargin: number;
}

export const financialService = {
  /**
   * Record a sale transaction with profit calculation
   * Uses batch cost_per_unit to calculate COGS
   */
  async recordSale(
    orderId: string, 
    amount: number, 
    paymentMethod: string
  ): Promise<void> {
    try {
      // Get order items with batch costs
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          batch_id,
          product_batches!inner(cost_per_unit)
        `)
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Failed to fetch order items for financial recording:', itemsError);
        throw itemsError;
      }

      if (!orderItems || orderItems.length === 0) {
        console.warn(`No order items found for order ${orderId}`);
        return;
      }

      // Calculate total cost from batches
      const totalCost = orderItems.reduce((sum, item: any) => {
        const costPerUnit = item.product_batches?.cost_per_unit || 0;
        return sum + (item.quantity * costPerUnit);
      }, 0);

      const profit = amount - totalCost;

      // Record the transaction
      const { error: insertError } = await supabase
        .from('financial_transactions')
        .insert({
          order_id: orderId,
          transaction_type: 'sale',
          amount: amount,
          cost: totalCost,
          profit: profit,
          payment_method: paymentMethod,
          notes: `Sale completed via ${paymentMethod}`
        });

      if (insertError) {
        console.error('Failed to record sale transaction:', insertError);
        throw insertError;
      }

      console.log(`✅ Recorded sale transaction for order ${orderId}: Revenue ${amount}, Cost ${totalCost}, Profit ${profit}`);
    } catch (error) {
      console.error('Error in recordSale:', error);
      // Don't throw - log error but don't break order flow
    }
  },

  /**
   * Record a refund and reverse the financial impact
   * Creates negative transaction to offset original sale
   */
  async recordRefund(orderId: string, refundAmount?: number): Promise<void> {
    try {
      // Get the original sale transaction
      const { data: originalTx, error: txError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('order_id', orderId)
        .eq('transaction_type', 'sale')
        .single();

      if (txError || !originalTx) {
        console.warn(`No original transaction found for refund of order ${orderId}`);
        // Still record the refund with the amount provided
        const amount = refundAmount || 0;
        
        const { error: insertError } = await supabase
          .from('financial_transactions')
          .insert({
            order_id: orderId,
            transaction_type: 'refund',
            amount: -amount,
            cost: 0,
            profit: -amount,
            notes: 'Refund processed - no original transaction found'
          });

        if (insertError) {
          console.error('Failed to record refund:', insertError);
        }
        return;
      }

      // Record negative transaction to reverse the sale
      const { error: insertError } = await supabase
        .from('financial_transactions')
        .insert({
          order_id: orderId,
          transaction_type: 'refund',
          amount: -originalTx.amount,  // Negative to reverse revenue
          cost: -originalTx.cost,      // Negative to reverse cost
          profit: -originalTx.profit,  // Negative to reverse profit
          payment_method: originalTx.payment_method,
          notes: 'Refund processed - revenue, cost, and profit reversed'
        });

      if (insertError) {
        console.error('Failed to record refund transaction:', insertError);
        throw insertError;
      }

      console.log(`✅ Recorded refund transaction for order ${orderId}: Reversed ${originalTx.amount} revenue, ${originalTx.cost} cost, ${originalTx.profit} profit`);
    } catch (error) {
      console.error('Error in recordRefund:', error);
      // Don't throw - log error but don't break refund flow
    }
  },

  /**
   * Get financial summary for a date range
   * Returns aggregated metrics for dashboard display
   */
  async getFinancialSummary(startDate: Date, endDate: Date): Promise<FinancialSummary> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        console.error('Failed to fetch financial transactions:', error);
        throw error;
      }

      const summary: FinancialSummary = {
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
        salesCount: 0,
        refundsCount: 0,
        refundedAmount: 0,
        netRevenue: 0,
        netProfit: 0,
        profitMargin: 0
      };

      if (!data || data.length === 0) {
        return summary;
      }

      data.forEach((tx) => {
        summary.totalRevenue += tx.amount;
        summary.totalCost += tx.cost;
        summary.grossProfit += tx.profit;

        if (tx.transaction_type === 'sale') {
          summary.salesCount++;
        } else if (tx.transaction_type === 'refund') {
          summary.refundsCount++;
          summary.refundedAmount += Math.abs(tx.amount);
        }
      });

      summary.netRevenue = summary.totalRevenue;
      summary.netProfit = summary.grossProfit;
      summary.profitMargin = summary.netRevenue > 0 
        ? (summary.netProfit / summary.netRevenue) * 100 
        : 0;

      return summary;
    } catch (error) {
      console.error('Error in getFinancialSummary:', error);
      throw error;
    }
  },

  /**
   * Get all transactions for a specific order
   */
  async getOrderTransactions(orderId: string): Promise<FinancialTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch order transactions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getOrderTransactions:', error);
      return [];
    }
  },

  /**
   * Get transactions for a specific date
   */
  async getTransactionsByDate(date: Date): Promise<FinancialTransaction[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch transactions by date:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTransactionsByDate:', error);
      return [];
    }
  }
};
