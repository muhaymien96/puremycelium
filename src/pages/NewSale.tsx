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

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    let filtered = products.filter(p => p.is_active !== false);
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    // Sort by popularity (total sales) - for now, just by stock as proxy
    return filtered.sort((a, b) => b.total_stock - a.total_stock);
  }, [products, searchQuery, categoryFilter]);

  // Top 5 products to show initially
  const topProducts = filteredProducts.slice(0, 5);
  const remainingProducts = filteredProducts.slice(5);
  
  // Get unique categories
  const categories = useMemo(() => {
    if (!products) return [];
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats);
  }, [products]);

  // Load cart from localStorage on mount or if retry param exists
  useEffect(() => {
    const retryOrderId = searchParams.get('retry');
    if (retryOrderId) {
      // Restore cart from failed order
      const restoreCart = async () => {
        const { data: order, error } = await supabase
          .from('orders')
          .select('*, order_items(*, products(*))')
          .eq('id', retryOrderId)
          .single();

        if (!error && order) {
          const restoredCart = order.order_items.map((item: any) => ({
            id: item.products.id,
            name: item.products.name,
            price: item.unit_price,
            unit_price: item.unit_price,
            quantity: item.quantity,
          }));
          setCartItems(restoredCart);
          setCustomerId(order.customer_id || 'none');
          toast.info('Cart restored from previous order');
        }
      };
      restoreCart();
    } else {
      // Load saved cart from localStorage
      const savedCart = localStorage.getItem('newSaleCart');
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          setCartItems(parsed.items || []);
          setCustomerId(parsed.customerId || 'none');
        } catch (e) {
          console.error('Failed to restore cart:', e);
        }
      }
    }
  }, [searchParams]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cartItems.length > 0 || customerId !== 'none') {
      localStorage.setItem('newSaleCart', JSON.stringify({
        items: cartItems,
        customerId,
        timestamp: Date.now()
      }));
    }
  }, [cartItems, customerId]);

  // Real-time check: remove inactive products from cart
  useEffect(() => {
    if (products && cartItems.length > 0) {
      const inactiveItems = cartItems.filter(item => {
        const product = products.find(p => p.id === item.id);
        return !product || product.is_active === false;
      });

      if (inactiveItems.length > 0) {
        const names = inactiveItems.map(i => i.name).join(', ');
        toast.warning(
          `${inactiveItems.length} product(s) removed from cart: ${names}`,
          { description: 'These products are no longer available' }
        );
        setCartItems(prev => prev.filter(item => {
          const product = products.find(p => p.id === item.id);
          return product && product.is_active !== false;
        }));
      }
    }
  }, [products, cartItems]);

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

    // Validate customer email if sending payment link
    if (paymentMethod === 'PAYMENT_LINK' && sendLinkToCustomer) {
      if (customerId === 'none') {
        toast.error('Please select a customer to send payment link');
        return;
      }
      const selectedCustomer = customers?.find(c => c.id === customerId);
      if (!selectedCustomer?.email) {
        toast.error('Selected customer has no email address');
        return;
      }
    }

    try {
      // Create order
      const orderData = {
        customer_id: customerId === 'none' ? null : customerId,
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        tax_amount: 0,
        discount_amount: 0,
      };

      const { order } = await createOrder.mutateAsync(orderData);

      // Handle different payment methods
      if (paymentMethod === 'CASH') {
        // Cash payment processed immediately
        const paymentData = {
          order_id: order.id,
          payment_method: paymentMethod,
          amount: total,
        };
        await processPayment.mutateAsync(paymentData);
        
        // Clear cart after successful payment
        localStorage.removeItem('newSaleCart');
        setCartItems([]);
        setCustomerId('none');
        
        navigate(`/payment/success?orderId=${order.id}`);
        
      } else if (paymentMethod === 'PAYMENT_LINK' && sendLinkToCustomer) {
        // Send payment link to customer via email
        const selectedCustomer = customers?.find(c => c.id === customerId);
        await sendPaymentLink.mutateAsync({
          order_id: order.id,
          customer_email: selectedCustomer?.email || '',
          amount: total,
        });

        // Clear cart after sending link
        localStorage.removeItem('newSaleCart');
        setCartItems([]);
        setCustomerId('none');
        
        toast.success(`Payment link sent to ${selectedCustomer?.email}`);
        navigate('/dashboard');
        
      } else if (paymentMethod === 'YOKO_WEBPOS') {
        // Show terminal payment modal
        setCurrentOrderId(order.id);
        setCurrentOrderNumber(order.order_number);
        setShowTerminalModal(true);
        
      } else if (paymentMethod === 'PAYMENT_LINK') {
        // Redirect user to payment (existing flow)
        const paymentData = {
          order_id: order.id,
          payment_method: paymentMethod,
          amount: total,
        };
        const result = await processPayment.mutateAsync(paymentData);

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
                    <SelectItem value="none">No customer</SelectItem>
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
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingProducts ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                {/* Top Products (Always Visible) */}
                {topProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {product.category} • R {product.unit_price} • Stock: {product.total_stock}
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
                ))}

                {/* Remaining Products (Collapsible) */}
                {remainingProducts.length > 0 && (
                  <Collapsible open={showAllProducts} onOpenChange={setShowAllProducts}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between">
                        <span>{showAllProducts ? 'Show Less' : `Show ${remainingProducts.length} More Products`}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showAllProducts ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {remainingProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                          <div className="flex-1">
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {product.category} • R {product.unit_price} • Stock: {product.total_stock}
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
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {searchQuery || categoryFilter !== 'all' ? 'No products match your search' : 'No products available'}
              </p>
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
              onClick={() => {
                setPaymentMethod('CASH');
                setSendLinkToCustomer(false);
              }}
              className={`w-full p-4 rounded-lg border flex items-center gap-3 transition-colors ${
                paymentMethod === 'CASH' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
              }`}
            >
              <Banknote className="h-5 w-5" />
              <span className="font-medium">Cash</span>
            </button>
            <button
              onClick={() => {
                setPaymentMethod('YOKO_WEBPOS');
                setSendLinkToCustomer(false);
              }}
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

            {paymentMethod === 'PAYMENT_LINK' && (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <input
                  type="checkbox"
                  id="sendToCustomer"
                  checked={sendLinkToCustomer}
                  onChange={(e) => setSendLinkToCustomer(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="sendToCustomer" className="text-sm flex items-center gap-2 cursor-pointer">
                  <Mail className="w-4 h-4" />
                  Send payment link to customer via email
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        <AddCustomerModal open={showCustomerModal} onOpenChange={setShowCustomerModal} />

        {showTerminalModal && currentOrderId && (
          <ProcessingModal
            isOpen={showTerminalModal}
            amount={total}
            orderNumber={currentOrderNumber || undefined}
            onConfirm={async () => {
              try {
                const paymentData = {
                  order_id: currentOrderId,
                  payment_method: 'YOKO_WEBPOS',
                  amount: total,
                  manual_terminal_confirmation: true,
                };
                await processPayment.mutateAsync(paymentData);
                
                // Clear cart after successful payment
                localStorage.removeItem('newSaleCart');
                setCartItems([]);
                setCustomerId('none');
                setShowTerminalModal(false);
                
                navigate(`/payment/success?orderId=${currentOrderId}`);
              } catch (error) {
                console.error('Terminal payment confirmation error:', error);
                toast.error('Failed to confirm payment');
              }
            }}
            onCancel={() => {
              setShowTerminalModal(false);
              toast.info('Payment cancelled. Cart preserved.');
            }}
            isProcessing={processPayment.isPending}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default NewSale;
