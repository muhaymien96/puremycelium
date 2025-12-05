import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Batch {
  id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string | null;
  notes: string | null;
  product_id: string;
}

interface EditBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: Batch | null;
}

export function EditBatchModal({ open, onOpenChange, batch }: EditBatchModalProps) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (batch) {
      setQuantity(batch.quantity.toString());
      setExpiryDate(batch.expiry_date || '');
      setNotes(batch.notes || '');
    }
  }, [batch]);

  const updateBatchMutation = useMutation({
    mutationFn: async (data: { batchId: string; quantity: number; expiryDate: string | null; notes: string | null; originalQuantity: number }) => {
      const { data: result, error } = await supabase.functions.invoke('product-batches', {
        method: 'PUT',
        body: {
          batch_id: data.batchId,
          quantity: data.quantity,
          expiry_date: data.expiryDate,
          notes: data.notes,
          original_quantity: data.originalQuantity,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Batch updated successfully');
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Update batch error:', error);
      toast.error(`Failed to update batch: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty < 0) {
      toast.error('Quantity must be a non-negative number');
      return;
    }

    updateBatchMutation.mutate({
      batchId: batch.id,
      quantity: parsedQty,
      expiryDate: expiryDate || null,
      notes: notes || null,
      originalQuantity: batch.quantity,
    });
  };

  const quantityDiff = batch ? parseFloat(quantity || '0') - batch.quantity : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Batch {batch?.batch_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity on Hand</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            {quantityDiff !== 0 && (
              <p className={`text-xs ${quantityDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {quantityDiff > 0 ? '+' : ''}{quantityDiff.toFixed(2)} units (will create stock movement)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this batch"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateBatchMutation.isPending}>
              {updateBatchMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
