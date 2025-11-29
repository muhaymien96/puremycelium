# Refund Button State Analysis

## Current Implementation

### Location
`src/components/OrderDetailModal.tsx` (Line 94)

### Current Logic
```tsx
const canRefund = order?.status !== 'cancelled' && 
                 order?.status !== 'refunded' && 
                 totalRefunded < Number(order?.total_amount || 0);
```

**Current Conditions:**
- ✅ Order is not cancelled
- ✅ Order is not fully refunded
- ✅ Remaining refundable amount > 0
- ❌ **MISSING**: Check for completed payment

## Problem Identified

**Issue:** The refund button is enabled even when there's no completed payment.

**Current Behavior:**
- Refund button shows for pending orders
- Refund button shows for failed payments
- Users can attempt refunds before payment is processed

**Expected Behavior (Best Practice):**
- Refund button should ONLY be enabled when:
  1. Order has a payment with status = 'completed'
  2. Order is not cancelled
  3. Order is not fully refunded  
  4. Remaining refundable amount > 0

## Recommended Fix

### Update `OrderDetailModal.tsx` (Line 94)

**Replace:**
```tsx
const canRefund = order?.status !== 'cancelled' && 
                 order?.status !== 'refunded' && 
                 totalRefunded < Number(order?.total_amount || 0);
```

**With:**
```tsx
const hasCompletedPayment = order?.payments?.some(
  (p: any) => p.payment_status === 'completed'
);

const canRefund = hasCompletedPayment &&
                 order?.status !== 'cancelled' && 
                 order?.status !== 'refunded' && 
                 totalRefunded < Number(order?.total_amount || 0);
```

## Test Coverage Created

### Test File
`tests/e2e/refund-button.spec.ts` - 7 comprehensive tests

### Tests Included:

1. **[REFUND] should be disabled when order has no completed payment**
   - Verifies button is disabled/hidden without completed payment
   - Tests pending payment states

2. **[REFUND] should be enabled when order has completed payment**
   - Confirms button appears and is enabled with completed payment
   - Validates proper order state

3. **[REFUND] should NOT be visible when order is cancelled**
   - Ensures cancelled orders can't be refunded
   - Tests order status validation

4. **[REFUND] should NOT be visible when order is fully refunded**
   - Prevents duplicate refunds
   - Validates refund amount tracking

5. **[REFUND] button should have correct text and icon**
   - Checks "Process Refund" text
   - Verifies RefreshCw icon presence
   - Confirms destructive (red) styling

6. **[REFUND] clicking refund button should open refund modal**
   - Tests modal opening
   - Validates modal content (amount input, reason select)

7. **[REFUND_BEST_PRACTICE] refund button should only be enabled after successful payment**
   - Tests multiple orders
   - Verifies pattern consistency
   - Confirms best practice adherence

## Frontend Code Changes Needed

### File: `src/components/OrderDetailModal.tsx`

**Line ~88-94:**
```tsx
// Add payment status check
const hasCompletedPayment = order?.payments?.some(
  (p: any) => p.payment_status === 'completed'
);

const totalRefunded = order?.refunds?.reduce(
  (sum, refund) => sum + (refund.status === 'completed' ? Number(refund.amount) : 0),
  0
) || 0;

// Update canRefund logic to include payment check
const canRefund = hasCompletedPayment &&
                 order?.status !== 'cancelled' && 
                 order?.status !== 'refunded' && 
                 totalRefunded < Number(order?.total_amount || 0);
```

## Payment Status Flow

### Order Lifecycle:
1. **Order Created** → status: 'pending', no payments
2. **Payment Attempted** → payment created with status: 'pending'
3. **Payment Successful** → payment status: 'completed' ✅ (refund button enabled)
4. **Payment Failed** → payment status: 'failed' ❌ (no refund button)

### Refund Flow:
1. User clicks "Process Refund" (only visible with completed payment)
2. Refund modal opens with amount/reason/items selection
3. Refund processed through Edge Function
4. Stock restored (if items selected)
5. Order status updated to 'refunded' or 'partially_refunded'

## Edge Cases Handled

### By Current Logic:
- ✅ Cancelled orders (no refund button)
- ✅ Fully refunded orders (no refund button)
- ✅ Partial refund limit (max = total - already refunded)

### By Proposed Fix:
- ✅ **Pending payments (NEW)** - no refund button until payment completes
- ✅ **Failed payments (NEW)** - no refund button for failed transactions
- ✅ Orders without payments - no refund button

## API/Backend Validation

**Note:** The backend (`supabase/functions/order-refund`) should also validate:
- Payment exists and is completed
- Refund amount doesn't exceed available balance
- Order is in valid state for refund

**Frontend validation prevents:**
- UI confusion
- Unnecessary API calls
- Poor user experience

**Backend validation prevents:**
- Security issues
- Data integrity problems
- Invalid refund processing

## Test Execution

### Run Refund Tests:
```bash
npm run test:e2e -- tests/e2e/refund-button.spec.ts
```

### Run All E2E Tests:
```bash
npm run test:e2e
```

### Run with UI Mode (Debug):
```bash
npm run test:e2e:ui -- tests/e2e/refund-button.spec.ts
```

## Expected Test Results

### Before Fix:
- ❌ Tests will FAIL - button appears without completed payment
- This confirms the bug exists

### After Fix:
- ✅ All tests should PASS
- Button only appears with completed payments
- Proper state validation throughout

## Additional Enhancements (Optional)

### User Feedback:
Add tooltip/message when refund button is disabled:
```tsx
{!hasCompletedPayment && (
  <Alert>
    <AlertDescription>
      Refund is only available after payment is completed.
    </AlertDescription>
  </Alert>
)}
```

### Payment Status Badge:
Highlight payment status more prominently in order detail:
```tsx
<Badge className={getPaymentStatusColor(payment.payment_status)}>
  {payment.payment_status === 'completed' && <CheckCircle className="mr-1" />}
  {payment.payment_status}
</Badge>
```

## Summary

**Problem:** Refund button enabled without completed payment  
**Impact:** Users confused, potential invalid refund attempts  
**Fix:** Add `hasCompletedPayment` check to `canRefund` logic  
**Tests:** 7 tests created to verify proper behavior  
**Priority:** HIGH - affects payment flow integrity  

---

**Status:** ⏳ Awaiting frontend code changes  
**Test File:** `tests/e2e/refund-button.spec.ts` ✅ Ready  
**Page Object:** `tests/pages/OrdersPage.ts` ✅ Enhanced  

Once frontend changes are applied, run tests to verify:
```bash
npx playwright test tests/e2e/refund-button.spec.ts --project=chromium
```
