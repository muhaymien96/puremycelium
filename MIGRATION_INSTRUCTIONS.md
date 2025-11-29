# Critical Migration and Testing Instructions

## ⚠️ URGENT: Database Migration Required

The stock and financial tracking fixes are **code-complete** but require a database migration to work.

### What Was Fixed

#### 1. **Stock Tracking Fixed** ✅
- **Problem**: Stock movements were recorded but batch quantities never updated
- **Solution**: Added RPC functions (`increment_batch_quantity`, `decrement_batch_quantity`) and updated edge functions to call them
- **Files Changed**:
  - `supabase/functions/order-refund/index.ts` - Now calls `increment_batch_quantity` RPC
  - `supabase/functions/yoco-webhook/index.ts` - Restores stock on Yoco refunds

#### 2. **Financial Tracking Fixed** ✅
- **Problem**: Financial transactions not recorded for Yoco refunds
- **Solution**: Moved financial recording to execute BEFORE Yoco API early return
- **Files Changed**:
  - `supabase/functions/order-refund/index.ts` - Records financials for ALL payment types

#### 3. **Cancel vs Refund Button Logic Fixed** ✅
- **Problem**: Both buttons showed at inappropriate times
- **Solution**: 
  - **Cancel**: Only shows when NO payment completed (pre-payment, free action)
  - **Refund**: Only shows AFTER payment completed (post-payment, money return)
- **Files Changed**:
  - `src/components/OrderDetailModal.tsx` - Updated `canCancel` and `canRefund` logic

---

## 🚀 How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Select your project: `puremycelium`
   - Navigate to **SQL Editor**

2. **Copy and execute this SQL**:
   ```sql
   -- Add RPC functions for safe batch quantity management
   -- These functions provide atomic updates with validation to prevent negative stock

   -- Function to decrement batch quantity (used when orders are placed)
   CREATE OR REPLACE FUNCTION decrement_batch_quantity(
     p_batch_id UUID,
     p_quantity DECIMAL
   ) RETURNS VOID AS $$
   DECLARE
     v_current_quantity DECIMAL;
   BEGIN
     -- Get current quantity with row lock
     SELECT quantity INTO v_current_quantity
     FROM product_batches
     WHERE id = p_batch_id
     FOR UPDATE;

     -- Check if batch exists
     IF NOT FOUND THEN
       RAISE EXCEPTION 'Batch with id % not found', p_batch_id;
     END IF;

     -- Check if sufficient stock available
     IF v_current_quantity < p_quantity THEN
       RAISE EXCEPTION 'Insufficient stock in batch %. Available: %, Requested: %', 
         p_batch_id, v_current_quantity, p_quantity;
     END IF;

     -- Update the batch quantity
     UPDATE product_batches
     SET quantity = quantity - p_quantity
     WHERE id = p_batch_id;
     
   END;
   $$ LANGUAGE plpgsql;

   -- Function to increment batch quantity (used when refunds/returns are processed)
   CREATE OR REPLACE FUNCTION increment_batch_quantity(
     p_batch_id UUID,
     p_quantity DECIMAL
   ) RETURNS VOID AS $$
   BEGIN
     -- Check if batch exists
     IF NOT EXISTS (SELECT 1 FROM product_batches WHERE id = p_batch_id) THEN
       RAISE EXCEPTION 'Batch with id % not found', p_batch_id;
     END IF;

     -- Increment the batch quantity
     UPDATE product_batches
     SET quantity = quantity + p_quantity
     WHERE id = p_batch_id;
     
   END;
   $$ LANGUAGE plpgsql;

   -- Add helpful comment
   COMMENT ON FUNCTION decrement_batch_quantity IS 'Safely decrements batch quantity with validation to prevent negative stock';
   COMMENT ON FUNCTION increment_batch_quantity IS 'Safely increments batch quantity when processing refunds or returns';
   ```

3. **Click "Run"** and verify success message

### Option 2: Supabase CLI (If installed)

```bash
# Install Supabase CLI globally (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref acxhhfwvxtkvxkvmfiep

# Apply migrations
supabase db push
```

---

## ✅ Verification Steps

After applying the migration, test the following scenarios:

### Test 1: CASH Payment → Refund
1. Create an order with a product from a batch
2. Note the initial batch quantity (e.g., 100 kg)
3. Complete payment with CASH
4. **Verify**: Batch quantity decreased (e.g., 95 kg if ordered 5 kg)
5. **Verify**: Financial transaction recorded (sale)
6. Process a refund
7. **Verify**: Batch quantity increased back (e.g., 100 kg)
8. **Verify**: Financial transaction recorded (refund with negative amounts)

### Test 2: Yoco Payment Link → Refund
1. Create an order with a product from a batch
2. Note the initial batch quantity
3. Complete payment via Yoco payment link
4. **Verify**: Batch quantity decreased
5. **Verify**: Financial transaction recorded (sale)
6. Process a refund
7. **Verify**: Batch quantity increased back
8. **Verify**: Financial transaction recorded (refund with negative amounts)

### Test 3: Cancel Order (Pre-Payment)
1. Create a pending order
2. **Verify**: "Cancel Order" button is visible
3. **Verify**: "Process Refund" button is NOT visible
4. Click "Cancel Order"
5. **Verify**: Order status changes to "cancelled"

### Test 4: Refund Order (Post-Payment)
1. Create an order and complete payment
2. **Verify**: "Process Refund" button is visible
3. **Verify**: "Cancel Order" button is NOT visible
4. Process refund
5. **Verify**: Stock and financials update correctly

---

## 🔍 How to Monitor

### Check Stock Movements (History)
```sql
SELECT * FROM stock_movements 
WHERE reference_type IN ('ORDER', 'REFUND')
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Actual Batch Quantities (Current Inventory)
```sql
SELECT 
  pb.batch_number,
  p.name as product_name,
  pb.quantity as current_stock
FROM product_batches pb
JOIN products p ON pb.product_id = p.id
ORDER BY pb.created_at DESC;
```

### Check Financial Transactions
```sql
SELECT 
  ft.*,
  o.order_number
FROM financial_transactions ft
JOIN orders o ON ft.order_id = o.id
ORDER BY ft.created_at DESC
LIMIT 10;
```

### Verify Stock + Financial Consistency
```sql
-- This should show matching stock movements and financial transactions
SELECT 
  o.order_number,
  o.status,
  pb.batch_number,
  pb.quantity as batch_stock,
  (SELECT SUM(quantity) FROM stock_movements WHERE batch_id = pb.id) as total_movements,
  (SELECT SUM(amount) FROM financial_transactions WHERE order_id = o.id) as financial_total
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN product_batches pb ON oi.batch_id = pb.id
ORDER BY o.created_at DESC
LIMIT 5;
```

---

## 📊 Expected Behavior After Migration

### Before Order Payment:
- Batch quantity: **100 kg**
- Financial transactions: **None**
- Stock movements: **None**

### After Order Payment (5 kg ordered):
- Batch quantity: **95 kg** ✅
- Financial transactions: **1 sale** (revenue: R500, cost: R250, profit: R250)
- Stock movements: **1 OUT** (-5 kg)

### After Refund (5 kg refunded):
- Batch quantity: **100 kg** ✅ (restored)
- Financial transactions: **2 total** (sale + refund with negative amounts)
- Stock movements: **2 total** (OUT + IN)

---

## 🐛 Troubleshooting

### Issue: "Function decrement_batch_quantity does not exist"
- **Cause**: Migration not applied
- **Solution**: Run the SQL in Supabase dashboard

### Issue: Stock movements show but batch quantity unchanged
- **Cause**: Old edge functions running (cached)
- **Solution**: 
  1. Verify migration was applied: `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%batch_quantity%'`
  2. Re-deploy edge functions or wait for cache to clear

### Issue: Financial transactions not recording
- **Cause**: Edge function error or database constraint
- **Solution**: Check Supabase Edge Function logs in dashboard

### Issue: Both Cancel and Refund buttons show
- **Cause**: Old frontend code running
- **Solution**: Hard refresh browser (Ctrl+F5) to clear cache

---

## 📝 Summary of Changes

### Database Layer:
- ✅ Created `increment_batch_quantity(batch_id, quantity)` RPC function
- ✅ Created `decrement_batch_quantity(batch_id, quantity)` RPC function
- ✅ Functions include validation to prevent negative stock

### Backend Layer (Edge Functions):
- ✅ `order-refund/index.ts`: Calls `increment_batch_quantity` to restore stock
- ✅ `order-refund/index.ts`: Records financials for ALL payment types (CASH + Yoco)
- ✅ `yoco-webhook/index.ts`: Restores stock when Yoco refunds complete

### Frontend Layer:
- ✅ `OrderDetailModal.tsx`: Cancel button only shows pre-payment
- ✅ `OrderDetailModal.tsx`: Refund button only shows post-payment
- ✅ Clear user messaging distinguishing free cancellation vs paid refund

---

## 🎯 Next Steps

1. **Apply the database migration** (see Option 1 or 2 above)
2. **Test all 4 scenarios** listed in Verification Steps
3. **Monitor the SQL queries** to verify data consistency
4. **Report any issues** with specific order IDs for debugging

---

**Status**: All code changes complete ✅ | Migration pending ⏳ | Testing required 🧪
