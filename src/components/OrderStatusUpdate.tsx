import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUpdateOrderStatus } from '@/hooks/useOrders';
import { toast } from 'sonner';

interface OrderStatusUpdateProps {
  orderId: string;
  currentStatus: string;
  onSuccess?: () => void;
}

const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
  refunded: [],
  partially_refunded: ['refunded', 'cancelled'],
};

export function OrderStatusUpdate({ orderId, currentStatus, onSuccess }: OrderStatusUpdateProps) {
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const updateStatus = useUpdateOrderStatus();

  const availableStatuses = STATUS_FLOW[currentStatus as keyof typeof STATUS_FLOW] || [];

  const handleUpdate = async () => {
    if (!newStatus) {
      toast.error('Please select a status');
      return;
    }

    updateStatus.mutate(
      {
        order_id: orderId,
        new_status: newStatus,
        notes,
      },
      {
        onSuccess: () => {
          toast.success('Order status updated successfully');
          setNewStatus('');
          setNotes('');
          onSuccess?.();
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to update status');
        },
      }
    );
  };

  if (availableStatuses.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-muted text-center text-sm text-muted-foreground">
        No status updates available for this order
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>New Status</Label>
        <Select value={newStatus} onValueChange={setNewStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Select new status" />
          </SelectTrigger>
          <SelectContent>
            {availableStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status.replace('_', ' ').toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this status change..."
          rows={3}
        />
      </div>

      <Button
        onClick={handleUpdate}
        disabled={!newStatus || updateStatus.isPending}
        className="w-full"
      >
        {updateStatus.isPending ? 'Updating...' : 'Update Status'}
      </Button>
    </div>
  );
}
