import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Plus,
  Minus,
  Banknote,
  Link2,
  Mail,
  Flame,
  FileText,
} from 'lucide-react';

import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateOrder, useProcessPayment, useSendPaymentLink } from '@/hooks/useOrders';
import { useUpcomingMarketEvents } from '@/hooks/useMarketEvents';
import { useBusinessProfiles } from '@/hooks/useBusinessSettings';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { LoadingOverlay } from '@/components/LoadingOverlay';
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
  const [eventId, setEventId] = useState<string>('none');
  const [businessProfileId, setBusinessProfileId] = useState<string>('default');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [sendLinkToCustomer, setSendLinkToCustomer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [includeDelivery, setIncludeDelivery] = useState(false);
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [autoSendInvoice, setAutoSendInvoice] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [orderHistory, setOrderHistory] = useState<any[]>([]);

  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: customers, isLoading: loadingCustomers } = useCustomers();
  const { data: events, isLoading: loadingEvents } = useUpcomingMarketEvents();
  const { data: businessProfiles } = useBusinessProfiles();
  const createOrder = useCreateOrder();
  const processPayment = useProcessPayment();
  const sendPaymentLink = useSendPaymentLink();

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = includeDelivery ? 50 : 0;
  const total = subtotal + deliveryFee;
  const canCheckout = cartItems.length > 0 && !!paymentMethod;

  // Get selected customer details
  const selectedCustomer = useMemo(() => {
    if (customerId === 'none') return null;
    return customers?.find(c => c.id === customerId) || null;
  }, [customerId, customers]);

  const customerHasEmail = selectedCustomer?.email ? true : false;

  // Clear payment link selection if customer is deselected
  useEffect(() => {
    if (customerId === 'none' && paymentMethod === 'PAYMENT_LINK') {
      setPaymentMethod('');
    }
  }, [customerId, paymentMethod]);

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

    setIsProcessing(true);
    try {
      const orderData = {
        customer_id: customerId === 'none' ? null : customerId,
        market_event_id: eventId === 'none' ? null : eventId,
        business_profile_id: businessProfileId === 'default' ? null : businessProfileId,
        delivery_fee: deliveryFee,
        transaction_datetime: transactionDate !== new Date().toISOString().split('T')[0] 
          ? new Date(transactionDate).toISOString() 
          : undefined,
        items: cartItems.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
          unit_price: i.price,
        })),
      };
      const { order } = await createOrder.mutateAsync(orderData);

      if (paymentMethod === 'CASH') {
        await processPayment.mutateAsync({ 
          order_id: order.id, 
          payment_method: 'CASH', 
          amount: total,
          business_profile_id: businessProfileId === 'default' ? undefined : businessProfileId
        });

        // Note: Invoice is automatically generated and sent by the order-pay function
        // No need to manually send it here
        if (autoSendInvoice && customerHasEmail) {
          toast.success('Sale completed - invoice sent to customer');
        }

        navigate(`/payment/success?orderId=${order.id}`);
      }

      if (paymentMethod === 'PAYMENT_LINK') {
        if (customerHasEmail && selectedCustomer?.email) {
          // Send payment link via email
          await sendPaymentLink.mutateAsync({
            order_id: order.id,
            customer_email: selectedCustomer.email,
            amount: total,
            business_profile_id: businessProfileId === 'default' ? undefined : businessProfileId
          });
          toast.success('Payment link sent to customer');
          navigate(`/payment/success?orderId=${order.id}&linkSent=true`);
        } else {
          // No customer email - use redirect payment link
          const r = await processPayment.mutateAsync({ 
            order_id: order.id, 
            payment_method: 'PAYMENT_LINK', 
            amount: total,
            business_profile_id: businessProfileId === 'default' ? undefined : businessProfileId
          });
          if (r.checkout_url) window.location.href = r.checkout_url;
        }
      }
    } catch {
      toast.error('Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const ProductRow = ({ p }: any) => {
    const inCart = cartItems.find((i) => i.id === p.id);
    const out = p.total_stock <= 0;

    return (
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border rounded-xl p-3 flex justify-between items-center bg-card hover:shadow-sm transition-shadow"
      >
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
      </motion.div>
    );
  };

  const PaymentButton = ({ value, label, Icon, disabled, disabledReason }: any) => (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-colors ${
        paymentMethod === value ? 'border-primary bg-primary/5' : disabled ? 'opacity-50 cursor-not-allowed bg-muted/30' : 'hover:bg-muted/50'
      }`}
      onClick={() => !disabled && setPaymentMethod(value)}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
    >
      <Icon className="h-5 w-5" />
      <span className="flex-1 text-left">{label}</span>
      {disabled && <span className="text-xs text-muted-foreground">({disabledReason})</span>}
    </motion.button>
  );

  // Auto-invoice toggle component
  const AutoInvoiceToggle = () => {
    if (!customerHasEmail) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="auto-invoice" className="text-sm cursor-pointer">
            {paymentMethod === 'CASH' ? 'Send invoice after sale' : 'Email payment link'}
          </Label>
        </div>
        <Switch
          id="auto-invoice"
          checked={autoSendInvoice}
          onCheckedChange={setAutoSendInvoice}
        />
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 pb-28 space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">New Sale</h1>
        </div>

        {/* DESKTOP 3-COLUMN LAYOUT */}
        <div className="hidden lg:grid grid-cols-[1fr_2fr_1fr] gap-6">
          
          {/* LEFT: Customer & Event */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice From (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={businessProfileId} onValueChange={setBusinessProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Use default profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      {businessProfiles?.find(p => p.is_default)?.profile_name || 'Default'}
                    </SelectItem>
                    {businessProfiles?.filter(p => !p.is_default).map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.profile_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer</CardTitle>
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
                        {c.first_name} {c.last_name} {c.email && <span className="text-muted-foreground ml-1">({c.email})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedCustomer && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground"
                  >
                    {selectedCustomer.email ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <Mail className="h-3 w-3" /> {selectedCustomer.email}
                      </span>
                    ) : (
                      <span className="text-amber-600">No email - invoice cannot be sent</span>
                    )}
                  </motion.div>
                )}

                <Button variant="outline" onClick={() => setShowCustomerModal(true)} size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Add Customer
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transaction Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="date"
                  value={transactionDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
                {transactionDate !== new Date().toISOString().split('T')[0] && (
                  <p className="text-xs text-amber-600 mt-2">Recording historical transaction</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Event (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No event</SelectItem>
                    {events?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} - {new Date(e.event_date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* CENTER: Products */}
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

          {/* RIGHT: Cart + Payment */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Cart</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <AnimatePresence>
                  {cartItems.map((i) => (
                    <motion.div 
                      key={i.id} 
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex justify-between border p-3 rounded-lg"
                    >
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
                    </motion.div>
                  ))}
                </AnimatePresence>

                {cartItems.length > 0 && (
                  <>
                    <div className="flex justify-between items-center border-t pt-3 pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeDelivery}
                          onChange={(e) => setIncludeDelivery(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">Add Delivery</span>
                      </label>
                      {includeDelivery && <span className="text-sm">R {deliveryFee.toFixed(2)}</span>}
                    </div>
                    
                    <div className="space-y-1 text-sm pb-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>R {subtotal.toFixed(2)}</span>
                      </div>
                      {includeDelivery && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Delivery</span>
                          <span>R {deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

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
                <PaymentButton 
                  value="PAYMENT_LINK" 
                  label="Payment Link" 
                  Icon={Link2} 
                  disabled={customerId === 'none'}
                  disabledReason="Select customer"
                />
                
                <AnimatePresence>
                  {paymentMethod && <AutoInvoiceToggle />}
                </AnimatePresence>
              </CardContent>
            </Card>

            <Button className="w-full" disabled={!canCheckout || isProcessing} onClick={handleCheckout}>
              {isProcessing ? 'Processing...' : `Complete Sale — R ${total.toFixed(2)}`}
            </Button>
          </div>
        </div>

        {/* MOBILE: Customer & Event Cards */}
        <div className="lg:hidden space-y-4">
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

              {selectedCustomer && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground"
                >
                  {selectedCustomer.email ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Mail className="h-3 w-3" /> {selectedCustomer.email}
                    </span>
                  ) : (
                    <span className="text-amber-600">No email - invoice cannot be sent</span>
                  )}
                </motion.div>
              )}

              <Button variant="outline" onClick={() => setShowCustomerModal(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Customer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No event</SelectItem>
                  {events?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} - {new Date(e.event_date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
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
                  <AnimatePresence>
                    {cartItems.map((i) => (
                      <motion.div 
                        key={i.id} 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-between border p-3 rounded-lg"
                      >
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
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {cartItems.length > 0 && (
                    <>
                      <div className="flex justify-between items-center border-t pt-3 pb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeDelivery}
                            onChange={(e) => setIncludeDelivery(e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm">Add Delivery</span>
                        </label>
                        {includeDelivery && <span className="text-sm">R {deliveryFee.toFixed(2)}</span>}
                      </div>
                      
                      <div className="space-y-1 text-sm pb-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>R {subtotal.toFixed(2)}</span>
                        </div>
                        {includeDelivery && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Delivery</span>
                            <span>R {deliveryFee.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="font-bold text-lg border-t pt-3 flex justify-between">
                        <span>Total</span>
                        <span>R {total.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <PaymentButton value="CASH" label="Cash" Icon={Banknote} />
                  <PaymentButton 
                    value="PAYMENT_LINK" 
                    label="Payment Link" 
                    Icon={Link2} 
                    disabled={customerId === 'none'}
                    disabledReason="Select customer"
                  />
                  
                  <AnimatePresence>
                    {paymentMethod && <AutoInvoiceToggle />}
                  </AnimatePresence>
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

        {isProcessing && <LoadingOverlay message="Processing sale..." />}
      </div>
    </AppLayout>
  );
};

export default NewSale;
