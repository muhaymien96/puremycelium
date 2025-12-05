import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateBatch } from '@/hooks/useProducts';
import { useState, useEffect } from 'react';

interface AddBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productSku?: string;
}

// Generate a unique batch ID
const generateBatchId = (productSku?: string) => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const prefix = productSku ? productSku.substring(0, 6).toUpperCase() : 'BATCH';
  return `${prefix}-${dateStr}-${random}`;
};

export const AddBatchModal = ({ open, onOpenChange, productId, productName, productSku }: AddBatchModalProps) => {
  const createBatch = useCreateBatch();
  const [formData, setFormData] = useState({
    batch_number: '',
    quantity: '',
    production_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    notes: '',
  });

  // Auto-generate batch ID when modal opens
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        batch_number: generateBatchId(productSku),
      }));
    }
  }, [open, productSku]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBatch.mutateAsync({
      product_id: productId,
      ...formData,
      quantity: parseFloat(formData.quantity),
      cost_per_unit: null, // Cost is managed at product level only
      expiry_date: formData.expiry_date || null,
      notes: formData.notes || null,
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
            <Label htmlFor="batch_number">Batch ID</Label>
            <Input
              id="batch_number"
              value={formData.batch_number}
              onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">Auto-generated. Edit if needed.</p>
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="1"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
              placeholder="Enter quantity"
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
              placeholder="Any additional notes about this batch..."
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
