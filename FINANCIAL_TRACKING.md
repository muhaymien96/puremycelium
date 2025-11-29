# Financial Tracking Implementation

## Overview
This implementation adds comprehensive financial tracking to your PureMycelium application, integrating seamlessly with your existing batch tracking and stock movement system.

## Features Added

### 1. **Financial Transaction Tracking**
- Tracks revenue, cost of goods sold (COGS), and profit for each order
- Automatically records transactions when:
  - Cash payments are completed
  - Yoco payment links are paid
  - Card terminal payments are processed
- Calculates profit using batch `cost_per_unit`

### 2. **Refund Financial Reversals**
- Automatically reverses financial impact when refunds are processed
- Creates negative transactions to offset original sales
- Proportional reversals for partial refunds
- Works with both Cash and Yoco payment refunds

### 3. **Financial Dashboard Component**
- Displays key metrics:
  - **Net Revenue**: Total sales revenue after refunds
  - **Cost of Goods**: Total COGS
  - **Net Profit**: Revenue minus costs
  - **Refunds**: Total refunded amount
  - **Activity**: Total transaction count
- Real-time updates every 30 seconds
- Date range filtering support

## Database Schema

### New Table: `financial_transactions`
```sql
- id: UUID (primary key)
- order_id: UUID (foreign key to orders)
- transaction_type: 'sale' | 'refund' | 'adjustment'
- amount: DECIMAL(10,2) - Revenue/refund amount
- cost: DECIMAL(10,2) - Cost of goods sold
- profit: DECIMAL(10,2) - Calculated profit (amount - cost)
- payment_method: TEXT - Payment method used
- notes: TEXT - Optional notes
- created_at: TIMESTAMP
```

### Updated Table: `batches`
```sql
Added columns:
- cost_per_unit: DECIMAL(10,2) - Cost per unit for profit calculation
- total_cost: DECIMAL(10,2) - Auto-calculated (quantity * cost_per_unit)
```

## How to Set Up

### 1. Run Database Migration
```bash
# Execute the migration file
supabase db push
# Or manually run:
supabase/migrations/20251128_add_financial_tracking.sql
```

### 2. Update Batch Costs
After migration, update your existing batches with cost information:
```sql
UPDATE batches 
SET cost_per_unit = 50.00  -- Example: R50 per kg
WHERE product_id = 'your-product-id';
```

### 3. Add Financial Dashboard to UI
```typescript
import { FinancialSummary } from '@/components/FinancialSummary';

// In your Dashboard component:
<FinancialSummary />

// Or with custom date range:
<FinancialSummary 
  startDate={new Date('2025-01-01')}
  endDate={new Date('2025-12-31')}
/>
```

## Usage Examples

### Example 1: View Financial Summary
The FinancialSummary component automatically displays:
- Current month's financial data
- Auto-refreshes every 30 seconds
- Shows profit margin percentage

### Example 2: Track Refund Impact
When a refund is processed:
1. Stock is restored (existing functionality)
2. Financial transaction is reversed automatically
3. Revenue and profit are adjusted
4. Dashboard updates to reflect changes

### Example 3: Calculate Profit Margins
```typescript
import { financialService } from '@/lib/financial-service';

// Get monthly summary
const summary = await financialService.getFinancialSummary(
  new Date('2025-11-01'),
  new Date('2025-11-30')
);

console.log(`Profit Margin: ${summary.profitMargin}%`);
console.log(`Net Profit: R${summary.netProfit}`);
```

### Example 4: View Order Financials
```typescript
// Get all financial transactions for an order
const transactions = await financialService.getOrderTransactions(orderId);

transactions.forEach(tx => {
  console.log(`${tx.transaction_type}: R${tx.amount} (Profit: R${tx.profit})`);
});
```

## Integration Points

### ✅ **Already Integrated:**
1. **Cash Payments** (`order-pay` function)
   - Records financial transaction when cash payment completes
   - Deducts stock (existing)
   - Calculates profit from batch costs

2. **Yoco Payment Links** (`yoco-webhook` function)
   - Records financial transaction when payment succeeds
   - Deducts stock (existing)
   - Handles payment failures gracefully

3. **Refunds** (`order-refund` function)
   - Reverses financial transaction
   - Restores stock (existing)
   - Updates order status (existing)

### 📋 **What You Need to Do:**

1. **Set Batch Costs**
   - When creating new batches, set `cost_per_unit`
   - Update existing batches with cost data
   - Cost is used to calculate profit

2. **Add Dashboard Component**
   - Import and add `<FinancialSummary />` to your dashboard
   - Optionally customize date ranges

3. **Monitor Financial Data**
   - Review profit margins regularly
   - Identify unprofitable products
   - Track refund trends

## Data Flow

### Sale Transaction:
```
Order Created → Payment Completed → Stock Deducted → Financial Transaction Recorded
                                    (existing)        (NEW)
                                    
Transaction includes:
- Amount: Order total
- Cost: Sum of (item.quantity * batch.cost_per_unit)
- Profit: Amount - Cost
```

### Refund Transaction:
```
Refund Initiated → Stock Restored → Financial Reversal Recorded
                   (existing)        (NEW)
                   
Reversal includes:
- Amount: -refund_amount
- Cost: -proportional_cost
- Profit: -proportional_profit
```

## Important Notes

### ⚠️ **Existing Functionality Preserved**
- All existing batch tracking works as before
- Stock movement history unchanged
- Refund process remains the same
- No breaking changes to current features

### 💡 **Best Practices**
1. **Always set batch costs** when creating batches
2. **Review financial summary** regularly
3. **Check profit margins** to optimize pricing
4. **Monitor refund trends** for quality issues

### 🔍 **Troubleshooting**

**Issue: Profit shows as 0**
- Solution: Ensure batch `cost_per_unit` is set

**Issue: Financial dashboard not loading**
- Solution: Run the database migration first

**Issue: Refunds not reversing financials**
- Solution: Check that original sale transaction exists

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Batch costs can be set/updated
- [ ] Cash payments record financial transactions
- [ ] Yoco payments record financial transactions
- [ ] Refunds create negative transactions
- [ ] Dashboard displays correct totals
- [ ] Profit calculations are accurate
- [ ] Stock movements still work correctly

## Support

For issues or questions:
1. Check database migration completed
2. Verify batch costs are set
3. Check browser console for errors
4. Review Supabase edge function logs

## Summary

This implementation adds complete financial tracking while preserving all your existing batch and stock management functionality. The system now tracks:
- Revenue and costs for every sale
- Profit margins for each transaction
- Financial impact of refunds
- Comprehensive financial summaries

Your existing features continue to work exactly as before!
