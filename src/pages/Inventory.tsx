import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, AlertTriangle } from 'lucide-react';

const Inventory = () => {
  const navigate = useNavigate();

  const products = [
    { id: '1', name: 'Wildflower Honey 500g', stock: 15, category: 'Honey', lowStock: false },
    { id: '2', name: 'Oyster Mushrooms 250g', stock: 3, category: 'Mushrooms', lowStock: true },
    { id: '3', name: 'Shiitake Mushrooms 250g', stock: 12, category: 'Mushrooms', lowStock: false },
    { id: '4', name: 'Lavender Honey 500g', stock: 8, category: 'Honey', lowStock: false },
    { id: '5', name: 'Lion\'s Mane 200g', stock: 2, category: 'Mushrooms', lowStock: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Inventory</h1>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {products.map((product) => (
          <Card key={product.id} className={product.lowStock ? 'border-orange-500' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{product.name}</h3>
                    {product.lowStock && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{product.category}</p>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Stock on Hand</p>
                      <p className="text-lg font-bold">{product.stock}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Adjust</Button>
                  <Button size="sm" variant="outline">Add Batch</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default Inventory;