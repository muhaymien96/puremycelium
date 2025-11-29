import { supabase } from '@/integrations/supabase/client';

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
   * Get financial summary for a date range using existing tables
   */
  async getFinancialSummary(startDate: Date, endDate: Date): Promise<FinancialSummary> {
    try {
      // Get all payments (completed sales) in date range
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, payment_method, order_id')
        .eq('payment_status', 'completed')
        .gte('transaction_date', startDate.toISOString())
        .lte('transaction_date', endDate.toISOString());

      if (paymentsError) {
        console.error('Failed to fetch payments:', paymentsError);
        throw paymentsError;
      }

      // Get all refunds in date range
      const { data: refunds, error: refundsError } = await supabase
        .from('refunds')
        .select('amount')
        .in('status', ['approved', 'completed'])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (refundsError) {
        console.error('Failed to fetch refunds:', refundsError);
        throw refundsError;
      }

      const summary: FinancialSummary = {
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
        salesCount: payments?.length || 0,
        refundsCount: refunds?.length || 0,
        refundedAmount: 0,
        netRevenue: 0,
        netProfit: 0,
        profitMargin: 0
      };

      // Calculate revenue from payments
      if (payments && payments.length > 0) {
        summary.totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
      }

      // Calculate refunded amount
      if (refunds && refunds.length > 0) {
        summary.refundedAmount = refunds.reduce((sum, refund) => sum + refund.amount, 0);
      }

      // Calculate net revenue (revenue - refunds)
      summary.netRevenue = summary.totalRevenue - summary.refundedAmount;
      summary.netProfit = summary.netRevenue; // Simplified without cost tracking
      summary.profitMargin = summary.netRevenue > 0 
        ? (summary.netProfit / summary.netRevenue) * 100 
        : 0;

      return summary;
    } catch (error) {
      console.error('Error in getFinancialSummary:', error);
      throw error;
    }
  }
};
