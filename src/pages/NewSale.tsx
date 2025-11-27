import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Minus, CreditCard, Banknote, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const NewSale = () => {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [cartItems, setCartItems] = useState<any[]>([]);

  const products = [
    { id: '1', name: 'Wildflower Honey 500g', price: 120, stock: 15 },
    { id: '2', name: 'Oyster Mushrooms 250g', price: 45, stock: 8 },
    { id: '3', name: 'Shiitake Mushrooms 250g', price: 60, stock: 12 },
  ];

  const addToCart = (product: any) => {
    const existing = cartItems.find(item => item.id === product.id);
    if (existing) {
      setCartItems(cartItems.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCartItems(cartItems.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return newQty === 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Please add items to cart');
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    
    toast.success('Processing payment...');
    // Payment processing logic would go here
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">New Sale</h1>
          </div>
          <Button onClick={handleCheckout} disabled={cartItems.length === 0}>
            Complete Sale
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                <div className="flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">R {product.price} • Stock: {product.stock}</p>
                </div>
                <Button size="sm" onClick={() => addToCart(product)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cart */}
        {cartItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cart</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">R {item.price} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm w-8 text-center">{item.quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>R {total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`w-full p-4 rounded-lg border flex items-center gap-3 transition-colors ${
                paymentMethod === 'CASH' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
              }`}
            >
              <Banknote className="h-5 w-5" />
              <span className="font-medium">Cash</span>
            </button>
            <button
              onClick={() => setPaymentMethod('YOKO_WEBPOS')}
              className={`w-full p-4 rounded-lg border flex items-center gap-3 transition-colors ${
                paymentMethod === 'YOKO_WEBPOS' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
              }`}
            >
              <CreditCard className="h-5 w-5" />
              <span className="font-medium">Card (Yoco Terminal)</span>
            </button>
            <button
              onClick={() => setPaymentMethod('PAYMENT_LINK')}
              className={`w-full p-4 rounded-lg border flex items-center gap-3 transition-colors ${
                paymentMethod === 'PAYMENT_LINK' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
              }`}
            >
              <Link2 className="h-5 w-5" />
              <span className="font-medium">Payment Link</span>
            </button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewSale;