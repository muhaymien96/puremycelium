// FULL NEWSALE FILE WITH FAST FAVOURITES
// 📌 Paste this whole file replacing current NewSale.tsx

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Link2,
  Mail,
  Search,
  Flame,
} from 'lucide-react';

import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateOrder, useProcessPayment } from '@/hooks/useOrders';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { ProcessingModal } from '@/components/ProcessingModal';
import { supabase } from '@/integrations/supabase/client';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

const NewSale = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('none');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [sendLinkToCustomer, setSendLinkToCustomer] = useState(false);
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentOrderNumber, setCurrentOrderNumber] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [orderHistory, setOrderHistory] = useState<any[]>([]);

  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: customers, isLoading: loadingCustomers } = useCustomers();
  const createOrder = useCreateOrder();
  const processPayment = useProcessPayment();

  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const canCheckout = cartItems.length > 0 && !!paymentMethod;

  // Fetch last 50 orders → used for fast favourites
  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .order('created_at', { ascending: false })
        .limit(50);
      setOrderHistory(data || []);
    };
    fetchHistory();
  }, []);

  const fastFavourites = useMemo(() => {
    if (!products || orderHistory.length === 0) return [];

    const freq: Record<string, number> = {};

    orderHistory.forEach((item) => {
      freq[item.product_id] = (freq[item.product_id] || 0) + item.quantity;
    });

    return [...products]
      .filter((p) => freq[p.id] > 0)
      .sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0))
      .slice(0, 5);
  }, [products, orderHistory]);

  // Apply search + category filters
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

  // Persist cart
  useEffect(() => {
    if (cartItems.length > 0 || customerId !== 'none') {
      localStorage.setItem('newSaleCart', JSON.stringify({ items: cartItems, customerId }));
    }
  }, [cartItems, customerId]);

  const addToCart = (id: string, name: string, price: number) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id, name, price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleCheckout = async () => {
    if (!canCheckout) return toast.error('Add items & select payment');

    try {
      const orderData = {
        customer_id: customerId === 'none' ? null : customerId,
        items: cartItems.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
          unit_price: i.price,
        })),
      };
      const { order } = await createOrder.mutateAsync(orderData);

      if (paymentMethod === 'CASH') {
        await processPayment.mutateAsync({ order_id: order.id, payment_method: 'CASH', amount: total });
        navigate(`/payment/success?orderId=${order.id}`);
      }

      if (paymentMethod === 'YOKO_WEBPOS') {
        setCurrentOrderId(order.id);
        setCurrentOrderNumber(order.order_number);
        setShowTerminalModal(true);
      }

      if (paymentMethod === 'PAYMENT_LINK') {
        const r = await processPayment.mutateAsync({ order_id: order.id, payment_method: 'PAYMENT_LINK', amount: total });
        if (r.checkout_url) window.location.href = r.checkout_url;
      }
    } catch {
      toast.error('Checkout failed');
    }
  };

  const ProductRow = ({ p }: any) => {
    const inCart = cartItems.find((i) => i.id === p.id);
    const out = p.total_stock <= 0;

    return (
      <div className="border rounded-xl p-3 flex justify-between items-center bg-card hover:shadow-sm">
        <div>
          <p className="font-medium">{p.name}</p>
          <p className="text-xs text-muted-foreground">
            Stock {p.total_stock} • R {Number(p.unit_price).toFixed(2)}
          </p>
        </div>

        {inCart ? (
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              onClick={() => updateQuantity(p.id, -1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm">{inCart.quantity}</span>
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              onClick={() => updateQuantity(p.id, +1)}
              disabled={out}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            size="icon"
            variant="outline"
            className="rounded-full"
            onClick={() => addToCart(p.id, p.name, p.unit_price)}
            disabled={out}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  const PaymentButton = ({ value, label, Icon }: any) => (
    <button
      className={`flex items-center gap-3 w-full p-3 rounded-xl border ${
        paymentMethod === value ? 'border-primary bg-primary/5' : ''
      }`}
      onClick={() => setPaymentMethod(value)}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6 pb-28 space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">New Sale</h1>
          <Button onClick={handleCheckout} disabled={!canCheckout} className="hidden md:inline-block">
            Complete Sale — R {total.toFixed(2)}
          </Button>
        </div>

        {/* CUSTOMER */}
        <Card>
          <CardHeader>
            <CardTitle>Customer (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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

            <Button variant="outline" onClick={() => setShowCustomerModal(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Customer
            </Button>
          </CardContent>
        </Card>

        {/* DESKTOP */}
        <div className="hidden lg:grid grid-cols-[2fr_1fr] gap-6">
          {/* Product Panel */}
          <div className="space-y-4">

            {fastFavourites.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" /> Fast Favourites
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {fastFavourites.map((p) => (
                    <ProductRow key={p.id} p={p} />
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {filteredProducts.map((p) => (
                  <ProductRow key={p.id} p={p} />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* CART + PAYMENT */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Cart</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {cartItems.map((i) => (
                  <div key={i.id} className="flex justify-between border p-3 rounded-lg">
                    <span>{i.name}</span>
                    <div className="flex gap-2 items-center">
                      <Button size="icon" variant="outline" onClick={() => updateQuantity(i.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span>{i.quantity}</span>
                      <Button size="icon" variant="outline" onClick={() => updateQuantity(i.id, +1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(i.id)}>
                        ×
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="font-bold text-lg border-t pt-3 flex justify-between">
                  <span>Total</span>
                  <span>R {total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <PaymentButton value="CASH" label="Cash" Icon={Banknote} />
                <PaymentButton value="YOKO_WEBPOS" label="Card / Terminal" Icon={CreditCard} />
                <PaymentButton value="PAYMENT_LINK" label="Payment Link" Icon={Link2} />
              </CardContent>
            </Card>

            <Button className="w-full" disabled={!canCheckout} onClick={handleCheckout}>
              Complete Sale — R {total.toFixed(2)}
            </Button>
          </div>
        </div>

        {/* MOBILE TABS */}
        <div className="lg:hidden">
          <Tabs defaultValue="products">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="cart">Cart</TabsTrigger>
            </TabsList>

            {/* Tab Products */}
            <TabsContent value="products" className="space-y-4 mt-4">
              {fastFavourites.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <Flame className="h-4 w-4 text-orange-500" /> Fast Favourites
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {fastFavourites.map((p) => (
                      <ProductRow key={p.id} p={p} />
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle>Products</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {filteredProducts.map((p) => (
                    <ProductRow key={p.id} p={p} />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Cart */}
            <TabsContent value="cart" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle>Cart</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {cartItems.length === 0 && (
                    <p className="text-sm text-muted-foreground">Cart is empty</p>
                  )}
                  {cartItems.map((i) => (
                    <div key={i.id} className="flex justify-between border p-3 rounded-lg">
                      <span>{i.name}</span>
                      <div className="flex gap-2 items-center">
                        <Button size="icon" variant="outline" onClick={() => updateQuantity(i.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span>{i.quantity}</span>
                        <Button size="icon" variant="outline" onClick={() => updateQuantity(i.id, +1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => removeItem(i.id)}>
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <PaymentButton value="CASH" label="Cash" Icon={Banknote} />
                  <PaymentButton value="YOKO_WEBPOS" label="Card / Terminal" Icon={CreditCard} />
                  <PaymentButton value="PAYMENT_LINK" label="Payment Link" Icon={Link2} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* BOTTOM FLOAT BUTTON */}
        <div className="lg:hidden fixed bottom-16 left-0 right-0 px-4">
          <Button className="w-full shadow-lg" disabled={!canCheckout} onClick={handleCheckout}>
            Complete Sale — R {total.toFixed(2)}
          </Button>
        </div>

        {/* Modals */}
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
