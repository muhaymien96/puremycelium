import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, Minus, CreditCard, Banknote, Link2, Mail, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateOrder, useProcessPayment, useSendPaymentLink } from '@/hooks/useOrders';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { ProcessingModal } from '@/components/ProcessingModal';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const NewSale = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('none');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [sendLinkToCustomer, setSendLinkToCustomer] = useState(false);
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentOrderNumber, setCurrentOrderNumber] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAllProducts, setShowAllProducts] = useState(false);

  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: customers, isLoading: loadingCustomers } = useCustomers();
  const createOrder = useCreateOrder();
  const processPayment = useProcessPayment();
  const sendPaymentLink = useSendPaymentLink();

  // Filter product list
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products.filter((p) => p.is_active !== false);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    return filtered.sort((a, b) => b.total_stock - a.total_stock);
  }, [products, searchQuery, categoryFilter]);

  const topProducts = filteredProducts.slice(0, 5);
  const remainingProducts = filteredProducts.slice(5);

  const categories = useMemo(() => {
    if (!products) return [];
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  // Restore cart if retrying failed payment
  useEffect(() => {
    const retry = searchParams.get('retry');
    if (retry) {
      (async () => {
        const { data: order } = await supabase
          .from('orders')
          .select('*, order_items(*, products(*))')
          .eq('id', retry)
          .single();

        if (order) {
          const restored = order.order_items.map((i: any) => ({
            id: i.products.id,
            name: i.products.name,
            price: i.unit_price,
            quantity: i.quantity,
          }));
          setCartItems(restored);
          setCustomerId(order.customer_id || 'none');
        }
      })();
    } else {
      const saved = localStorage.getItem('newSaleCart');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCartItems(parsed.items || []);
          setCustomerId(parsed.customerId || 'none');
        } catch {}
      }
    }
  }, [searchParams]);

  // Persist cart
  useEffect(() => {
    if (cartItems.length > 0 || customerId !== 'none') {
      localStorage.setItem(
        'newSaleCart',
        JSON.stringify({ items: cartItems, customerId, timestamp: Date.now() })
      );
    }
  }, [cartItems, customerId]);

  // Remove inactive products from cart
  useEffect(() => {
    if (!products) return;
    setCartItems((current) =>
      current.filter((item) => products.some((p) => p.id === item.id))
    );
  }, [products]);

  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return toast.error('Add items first');
    if (!paymentMethod) return toast.error('Select payment method');

    if (paymentMethod === 'PAYMENT_LINK' && sendLinkToCustomer) {
      if (customerId === 'none') return toast.error('Select customer first');
      const c = customers?.find((c) => c.id === customerId);
      if (!c?.email) return toast.error('Customer missing email');
    }

    try {
      const orderData = {
        customer_id: customerId === 'none' ? null : customerId,
        items: cartItems.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
          unit_price: i.price,
        })),
        tax_amount: 0,
        discount_amount: 0,
      };

      const { order } = await createOrder.mutateAsync(orderData);

      if (paymentMethod === 'CASH') {
        await processPayment.mutateAsync({
          order_id: order.id,
          payment_method: 'CASH',
          amount: total,
        });
        localStorage.removeItem('newSaleCart');
        navigate(`/payment/success?orderId=${order.id}`);
      }

      if (paymentMethod === 'YOKO_WEBPOS') {
        setCurrentOrderId(order.id);
        setCurrentOrderNumber(order.order_number);
        setShowTerminalModal(true);
      }

      if (paymentMethod === 'PAYMENT_LINK') {
        const result = await processPayment.mutateAsync({
          order_id: order.id,
          payment_method: 'PAYMENT_LINK',
          amount: total,
        });
        if (result.checkout_url) window.location.href = result.checkout_url;
      }
    } catch (err) {
      console.error(err);
      toast.error('Checkout failed');
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-24">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">New Sale</h1>
          <Button onClick={handleCheckout} disabled={cartItems.length === 0}>
            Complete Sale
          </Button>
        </div>

        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No customer</SelectItem>
                {customers?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => setShowCustomerModal(true)} className="mt-3">
              <Plus className="w-4 h-4 mr-1" /> Add Customer
            </Button>
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingProducts ? (
              <Skeleton className="h-20 w-full" />
            ) : filteredProducts.length === 0 ? (
              <p>No products available</p>
            ) : (
              <>
                {topProducts.map((p) => (
                  <div key={p.id} className="flex justify-between items-center border p-3 rounded">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <span className="text-xs text-muted-foreground">Stock {p.total_stock}</span>
                    </div>
                    <Button
                      size="sm"
                      disabled={p.total_stock <= 0}
                      onClick={() =>
                        setCartItems((prev) => [
                          ...prev,
                          { id: p.id, name: p.name, price: p.unit_price, quantity: 1 },
                        ])
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Cart */}
        {cartItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cart</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cartItems.map((i) => (
                <div key={i.id} className="flex justify-between items-center border p-3 rounded">
                  <div>
                    <p>{i.name}</p>
                    <span className="text-sm">R {i.price} × {i.quantity}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button size="sm" variant="outline" onClick={() =>
                      setCartItems((prev) =>
                        prev
                          .map((x) =>
                            x.id === i.id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x
                          )
                          .filter((x) => x.quantity > 0)
                      )
                    }>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm">{i.quantity}</span>
                    <Button size="sm" variant="outline" onClick={() =>
                      setCartItems((prev) =>
                        prev.map((x) =>
                          x.id === i.id ? { ...x, quantity: x.quantity + 1 } : x
                        )
                      )
                    }>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>R {total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`w-full p-4 border rounded-lg flex gap-3 ${paymentMethod === 'CASH' ? 'border-primary' : ''}`}
            >
              <Banknote className="w-5 h-5" />
              Cash
            </button>

            <button
              onClick={() => setPaymentMethod('YOKO_WEBPOS')}
              className={`w-full p-4 border rounded-lg flex gap-3 ${paymentMethod === 'YOKO_WEBPOS' ? 'border-primary' : ''}`}
            >
              <CreditCard className="w-5 h-5" />
              Card / Terminal
            </button>

            <button
              onClick={() => setPaymentMethod('PAYMENT_LINK')}
              className={`w-full p-4 border rounded-lg flex gap-3 ${paymentMethod === 'PAYMENT_LINK' ? 'border-primary' : ''}`}
            >
              <Link2 className="w-5 h-5" />
              Payment Link
            </button>

            {paymentMethod === 'PAYMENT_LINK' && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendLinkToCustomer}
                  onChange={(e) => setSendLinkToCustomer(e.target.checked)}
                />
                <Mail className="w-4 h-4" /> Email link to customer
              </label>
            )}
          </CardContent>
        </Card>

        <AddCustomerModal open={showCustomerModal} onOpenChange={setShowCustomerModal} />

        {showTerminalModal && currentOrderId && (
          <ProcessingModal
            isOpen
            amount={total}
            orderNumber={currentOrderNumber || undefined}
            onConfirm={async () => {
              await processPayment.mutateAsync({
                order_id: currentOrderId,
                payment_method: 'YOKO_WEBPOS',
                amount: total,
                manual_terminal_confirmation: true,
              });
              localStorage.removeItem('newSaleCart');
              navigate(`/payment/success?orderId=${currentOrderId}`);
            }}
            onCancel={() => setShowTerminalModal(false)}
            isProcessing={processPayment.isPending}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default NewSale;
