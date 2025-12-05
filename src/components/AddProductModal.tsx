import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateProduct } from '@/hooks/useProducts';
import { useState, useEffect } from 'react';

export interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  onProductCreated?: (productId: string) => void;
}

export const AddProductModal = ({ 
  open, 
  onOpenChange, 
  defaultName = '',
  onProductCreated 
}: AddProductModalProps) => {
  const createProduct = useCreateProduct();
  const [formData, setFormData] = useState({
    name: '',
    category: 'honey',
    unit_price: '',
    cost_price: '',
    description: '',
    sku: '',
    unit_of_measure: 'kg',
  });

  // Update name when defaultName changes
  useEffect(() => {
    if (defaultName && open) {
      setFormData(f => ({ ...f, name: defaultName }));
    }
  }, [defaultName, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createProduct.mutateAsync({
      ...formData,
      unit_price: parseFloat(formData.unit_price),
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
    });
    
    if (onProductCreated && result?.product?.id) {
      onProductCreated(result.product.id);
    }
    
    onOpenChange(false);
    setFormData({
      name: '',
      category: 'honey',
      unit_price: '',
      cost_price: '',
      description: '',
      sku: '',
      unit_of_measure: 'kg',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="honey">Honey</SelectItem>
                <SelectItem value="mushroom">Mushroom</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit_price">Selling Price (R)</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="cost_price">Cost Price (R)</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                placeholder="Optional"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="sku">SKU (Optional)</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="unit_of_measure">Unit of Measure</Label>
            <Input
              id="unit_of_measure"
              value={formData.unit_of_measure}
              onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending ? 'Adding...' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
