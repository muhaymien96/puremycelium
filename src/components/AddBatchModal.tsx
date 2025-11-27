import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateBatch } from '@/hooks/useProducts';
import { useState } from 'react';

interface AddBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

export const AddBatchModal = ({ open, onOpenChange, productId, productName }: AddBatchModalProps) => {
  const createBatch = useCreateBatch();
  const [formData, setFormData] = useState({
    batch_number: '',
    quantity: '',
    production_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBatch.mutateAsync({
      product_id: productId,
      ...formData,
      quantity: parseFloat(formData.quantity),
      expiry_date: formData.expiry_date || null, // Convert empty string to null
      notes: formData.notes || null, // Convert empty string to null
    });
    onOpenChange(false);
    setFormData({
      batch_number: '',
      quantity: '',
      production_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Batch for {productName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="batch_number">Batch Number</Label>
            <Input
              id="batch_number"
              value={formData.batch_number}
              onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="production_date">Production Date</Label>
            <Input
              id="production_date"
              type="date"
              value={formData.production_date}
              onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBatch.isPending}>
              {createBatch.isPending ? 'Adding...' : 'Add Batch'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
