import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, CreditCard, Banknote, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateOrder, useProcessPayment } from '@/hooks/useOrders';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';

const NewSale = () => {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: customers, isLoading: loadingCustomers } = useCustomers();
  const createOrder = useCreateOrder();
  const processPayment = useProcessPayment();

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

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Please add items to cart');
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    try {
      // Create order
      const orderData = {
        customer_id: customerId || null,
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        tax_amount: 0,
        discount_amount: 0,
      };

      const { order } = await createOrder.mutateAsync(orderData);

      // Process payment
      const paymentData = {
        order_id: order.id,
        payment_method: paymentMethod,
        amount: total,
      };

      const result = await processPayment.mutateAsync(paymentData);

      if (paymentMethod === 'CASH') {
        navigate(`/payment/success?orderId=${order.id}`);
      } else {
        // Redirect to payment processing page for Yoco payments
        if (result.checkout_url) {
          window.location.href = result.checkout_url;
        } else {
          navigate(`/payment/processing?orderId=${order.id}&method=${paymentMethod}`);
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">New Sale</h1>
            <p className="text-sm text-muted-foreground">Create a new order and process payment</p>
          </div>
          <Button onClick={handleCheckout} disabled={cartItems.length === 0}>
            Complete Sale
          </Button>
        </div>
        {/* Customer Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer (optional)" />
              </SelectTrigger>
              <SelectContent>
                {loadingCustomers ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  <>
                    <SelectItem value="">No customer</SelectItem>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setShowCustomerModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Customer
            </Button>
          </CardContent>
        </Card>

        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingProducts ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : products && products.length > 0 ? (
              products.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      R {product.unit_price} • Stock: {product.total_stock}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => addToCart({ ...product, price: product.unit_price, stock: product.total_stock })}
                    disabled={product.total_stock === 0}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No products available</p>
            )}
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

        <AddCustomerModal open={showCustomerModal} onOpenChange={setShowCustomerModal} />
      </div>
    </AppLayout>
  );
};

export default NewSale;