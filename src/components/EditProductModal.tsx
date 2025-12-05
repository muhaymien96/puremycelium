import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateProduct, Product } from '@/hooks/useProducts';

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function EditProductModal({ open, onOpenChange, product }: EditProductModalProps) {
  const updateProduct = useUpdateProduct();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm();

  const category = watch('category');

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        category: product.category,
        unit_price: product.unit_price,
        cost_price: product.cost_price || '',
        description: product.description || '',
        sku: product.sku || '',
        unit_of_measure: product.unit_of_measure || 'unit',
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: any) => {
    if (!product) return;

    updateProduct.mutate(
      {
        productId: product.id,
        updates: {
          name: data.name,
          category: data.category,
          unit_price: parseFloat(data.unit_price),
          cost_price: data.cost_price ? parseFloat(data.cost_price) : null,
          description: data.description,
          sku: data.sku,
          unit_of_measure: data.unit_of_measure,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Raw Honey"
              {...register('name', { required: 'Product name is required' })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={category}
              onValueChange={(value) => setValue('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="honey">Honey</SelectItem>
                <SelectItem value="mushroom">Mushroom</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message as string}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price (R) *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('unit_price', {
                  required: 'Price is required',
                  min: { value: 0, message: 'Price must be positive' },
                })}
              />
              {errors.unit_price && (
                <p className="text-sm text-destructive">{errors.unit_price.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_price">Cost Price (R)</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('cost_price', {
                  min: { value: 0, message: 'Cost must be positive' },
                })}
              />
              {errors.cost_price && (
                <p className="text-sm text-destructive">{errors.cost_price.message as string}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit_of_measure">Unit of Measure</Label>
            <Select
              value={watch('unit_of_measure')}
              onValueChange={(value) => setValue('unit_of_measure', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unit">Unit</SelectItem>
                <SelectItem value="kg">Kilogram</SelectItem>
                <SelectItem value="g">Gram</SelectItem>
                <SelectItem value="l">Liter</SelectItem>
                <SelectItem value="ml">Milliliter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
            <Input
              id="sku"
              placeholder="e.g., HON-RAW-500"
              {...register('sku')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Product description..."
              rows={3}
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateProduct.isPending}>
              {updateProduct.isPending ? 'Updating...' : 'Update Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
