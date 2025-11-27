import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProcessRefund } from '@/hooks/useOrders';
import { toast } from 'sonner';

interface RefundModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

export function RefundModal({ order, isOpen, onClose }: RefundModalProps) {
  const [amount, setAmount] = useState(order.total_amount);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(order.order_items?.map((i: any) => i.id) || []));
  
  const processRefund = useProcessRefund();

  const totalRefunded = order.refunds?.reduce(
    (sum: number, refund: any) => sum + (refund.status === 'completed' ? Number(refund.amount) : 0),
    0
  ) || 0;

  const maxRefundAmount = Number(order.total_amount) - totalRefunded;
  const payment = order.payments?.find((p: any) => p.payment_status === 'completed');
  const isCashPayment = payment?.payment_method === 'CASH';
  const isYocoPayment = payment && (payment.payment_method === 'YOKO_WEBPOS' || payment.payment_method === 'PAYMENT_LINK');
  const hasCheckoutId = payment?.checkout_id;

  const handleSubmit = async () => {
    if (Number(amount) <= 0 || Number(amount) > maxRefundAmount) {
      toast.error(`Refund amount must be between R0.01 and R${maxRefundAmount.toFixed(2)}`);
      return;
    }

    if (!reason) {
      toast.error('Please select a refund reason');
      return;
    }

    const refundItems = order.order_items
      .filter((item: any) => selectedItems.has(item.id))
      .map((item: any) => ({
        order_item_id: item.id,
        product_id: item.product_id,
        batch_id: item.batch_id,
        quantity: item.quantity,
      }));

    processRefund.mutate(
      {
        order_id: order.id,
        payment_id: payment?.id,
        amount: Number(amount),
        reason,
        notes,
        items: refundItems,
      },
      {
        onSuccess: () => {
          toast.success('Refund processed successfully');
          onClose();
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to process refund');
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isCashPayment && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This is a CASH payment. Please ensure you manually return the cash to the customer.
              </AlertDescription>
            </Alert>
          )}
          
          {isYocoPayment && !hasCheckoutId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This payment cannot be refunded automatically (no checkout ID). Please process refund manually through Yoco dashboard.
              </AlertDescription>
            </Alert>
          )}
          
          {isYocoPayment && hasCheckoutId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Yoco refunds are processed asynchronously. The refund will be completed within a few moments after submission.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Refund Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxRefundAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Maximum refundable: R{maxRefundAmount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer Request">Customer Request</SelectItem>
                <SelectItem value="Defective Product">Defective Product</SelectItem>
                <SelectItem value="Order Cancelled">Order Cancelled</SelectItem>
                <SelectItem value="Wrong Item">Wrong Item</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Items to Return to Stock</Label>
            <div className="space-y-2 border rounded-lg p-3">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={item.id}
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(selectedItems);
                      if (checked) {
                        newSet.add(item.id);
                      } else {
                        newSet.delete(item.id);
                      }
                      setSelectedItems(newSet);
                    }}
                  />
                  <label
                    htmlFor={item.id}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                  >
                    <div className="flex justify-between">
                      <span>{item.products?.name}</span>
                      <span className="text-muted-foreground">Qty: {Number(item.quantity)}</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected items will be returned to stock
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this refund..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={processRefund.isPending}
              className="flex-1"
            >
              {processRefund.isPending ? 'Processing...' : 'Process Refund'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
