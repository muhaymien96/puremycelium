import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Clock, XCircle, FileText, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProcessPayment, useSendPaymentLink } from '@/hooks/useOrders';
import { useGenerateInvoice } from '@/hooks/useGenerateInvoice';

import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { RefundModal } from '@/components/RefundModal';
import { OrderStatusUpdate } from '@/components/OrderStatusUpdate';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface OrderDetailModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailModal({ orderId, isOpen, onClose }: OrderDetailModalProps) {
  const processPayment = useProcessPayment();
  const generateInvoice = useGenerateInvoice();
  const sendPaymentLink = useSendPaymentLink();
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (*),
          order_items (
            *,
            products (*),
            product_batches (*)
          ),
          payments (*),
          refunds (*),
          order_status_history (
            *,
            profiles (full_name)
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      
      // Sort status history by created_at desc
      if (data.order_status_history) {
        data.order_status_history.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      
      return data;
    },
    enabled: isOpen && !!orderId,
  });

  // Check if invoice exists for this order
  const { data: invoice } = useQuery({
    queryKey: ['invoice-for-order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, pdf_url')
        .eq('order_id', orderId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!orderId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'confirmed':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'shipped':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'delivered':
        return 'bg-green-600/10 text-green-700 border-green-600/20';
      case 'refunded':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      case 'partially_refunded':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'expired':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      case 'refunded':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const totalRefunded = order?.refunds?.reduce(
    (sum, refund) => sum + (refund.status === 'completed' ? Number(refund.amount) : 0),
    0
  ) || 0;

  const hasCompletedPayment = order?.payments?.some(
    (payment: any) => payment.payment_status === 'completed'
  );

  // Refund: Only show after payment completed (post-payment action with money return)
  const canRefund = hasCompletedPayment &&
                   order?.status !== 'cancelled' && 
                   order?.status !== 'refunded' && 
                   totalRefunded < Number(order?.total_amount || 0);

  // Cancel: Only show before payment completed (pre-payment action, no money involved)
  const canCancel = (order?.status === 'pending' || order?.status === 'confirmed') &&
                   !hasCompletedPayment;

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      const { error: statusError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (statusError) throw statusError;

      // Cancel any pending/unpaid invoices
      await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('order_id', orderId)
        .in('status', ['unpaid', 'pending']);

      // Mark any pending payments as failed (order was cancelled before payment)
      await supabase
        .from('payments')
        .update({ 
          payment_status: 'failed',
          notes: 'Order cancelled before payment'
        })
        .eq('order_id', orderId)
        .eq('payment_status', 'pending');

      // Add to status history
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          old_status: order?.status,
          new_status: 'cancelled',
          notes: 'Order cancelled by user',
        });

      if (historyError) throw historyError;
    },
    onSuccess: () => {
      toast.success('Order cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      refetch();
      setShowCancelDialog(false);
    },
    onError: (error) => {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    },
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : order ? (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="status">Status</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6 mt-4">
                {/* Order Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{order.order_number}</h3>
                    <Badge variant="outline" className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Customer Info */}
                {order.customers && (
                  <div>
                    <h4 className="font-semibold mb-2">Customer</h4>
                    <p className="text-sm">{order.customers.first_name} {order.customers.last_name}</p>
                    {order.customers.email && (
                      <p className="text-sm text-muted-foreground">{order.customers.email}</p>
                    )}
                    {order.customers.phone && (
                      <p className="text-sm text-muted-foreground">{order.customers.phone}</p>
                    )}
                  </div>
                )}

                <Separator />

                {/* Order Items */}
                <div>
                  <h4 className="font-semibold mb-3">Items</h4>
                  <div className="space-y-2">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-start p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{item.products?.name || item.product_name || 'Unknown Product'}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {Number(item.quantity)} × R{Number(item.unit_price).toFixed(2)}
                          </p>
                          {(item.products?.sku || item.product_sku) && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {item.products?.sku || item.product_sku}
                            </p>
                          )}
                          {item.product_batches && (
                            <p className="text-xs text-muted-foreground">
                              Batch: {item.product_batches.batch_number}
                            </p>
                          )}
                        </div>
                        <p className="font-semibold">R{Number(item.subtotal).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>R{(Number(order.total_amount) - Number(order.tax_amount || 0) + Number(order.discount_amount || 0)).toFixed(2)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-R{Number(order.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {order.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>R{Number(order.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>R{Number(order.total_amount).toFixed(2)}</span>
                  </div>
                  {totalRefunded > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Refunded:</span>
                      <span>-R{totalRefunded.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Payments */}
                {order.payments && order.payments.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Payments</h4>
                    <div className="space-y-2">
                      {order.payments.map((payment: any) => (
                        <div key={payment.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{payment.payment_method}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payment.created_at).toLocaleString()}
                            </p>
                            {payment.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">R{Number(payment.amount).toFixed(2)}</p>
                            <Badge variant="outline" className={`text-xs ${getPaymentStatusColor(payment.payment_status)}`}>
                              {payment.payment_status}
                            </Badge>
                            {/* Mark as Paid button for pending payments */}
                            {payment.payment_status === 'pending' && (
                              <Button
                                size="sm"
                                className="ml-2 mt-2"
                                disabled={processPayment.status === 'pending'}
                                onClick={() => {
                                  processPayment.mutate(
                                    {
                                      order_id: order.id,
                                      payment_method: payment.payment_method || 'CASH',
                                      amount: Number(payment.amount),
                                      manual_terminal_confirmation: true,
                                    },
                                    {
                                      onSuccess: () => {
                                        toast.success('Payment marked as paid');
                                        refetch();
                                      },
                                      onError: (err: any) => {
                                        toast.error('Failed to mark as paid');
                                      },
                                    }
                                  );
                                }}
                              >
                                Mark as Paid
                              </Button>
                            )}
                            {/* Resend Payment Link for failed/expired PAYMENT_LINK payments */}
                            {(payment.payment_status === 'failed' || payment.payment_status === 'expired') && 
                             payment.payment_method === 'PAYMENT_LINK' && 
                             order.customers?.email && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-2 mt-2"
                                disabled={sendPaymentLink.isPending}
                                onClick={() => {
                                  sendPaymentLink.mutate(
                                    {
                                      order_id: order.id,
                                      customer_email: order.customers.email,
                                      amount: order.total_amount,
                                    },
                                    {
                                      onSuccess: () => {
                                        toast.success('Payment link resent');
                                        refetch();
                                      },
                                      onError: (err: any) => {
                                        toast.error('Failed to resend payment link');
                                      },
                                    }
                                  );
                                }}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Resend Link
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Refunds */}
                {order.refunds && order.refunds.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Refund History</h4>
                    <div className="space-y-2">
                      {order.refunds.map((refund: any) => (
                        <div key={refund.id} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">R{Number(refund.amount).toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(refund.created_at).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {refund.status}
                            </Badge>
                          </div>
                          {refund.reason && (
                            <p className="text-sm text-muted-foreground">Reason: {refund.reason}</p>
                          )}
                          {refund.notes && (
                            <p className="text-sm text-muted-foreground">Notes: {refund.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  {!invoice && (
                    <Button
                      onClick={() => generateInvoice.mutate(orderId)}
                      variant="outline"
                      className="w-full"
                      disabled={generateInvoice.isPending}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {generateInvoice.isPending ? "Generating..." : "Generate Invoice"}
                    </Button>
                  )}
                  {canRefund && (
                    <Button
                      onClick={() => setShowRefundModal(true)}
                      variant="destructive"
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Process Refund
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      onClick={() => setShowCancelDialog(true)}
                      variant="outline"
                      className="w-full border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="status" className="space-y-4 mt-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Current Status</h4>
                    <Badge variant="outline" className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Update the order status to reflect its current state in the fulfillment process.
                  </p>
                  <OrderStatusUpdate
                    orderId={order.id}
                    currentStatus={order.status}
                    onSuccess={() => refetch()}
                  />
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                {order.order_status_history && order.order_status_history.length > 0 ? (
                  <div className="space-y-2">
                    {order.order_status_history.map((history: any) => (
                      <div key={history.id} className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {history.old_status && (
                                <Badge variant="outline" className="text-xs">
                                  {history.old_status.replace('_', ' ')}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">→</span>
                              <Badge variant="outline" className={`text-xs ${getStatusColor(history.new_status)}`}>
                                {history.new_status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(history.created_at).toLocaleString()}
                              {history.profiles && ` by ${history.profiles.full_name}`}
                            </p>
                            {history.notes && (
                              <p className="text-sm mt-2">{history.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No status history available</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-center text-muted-foreground py-8">Order not found</p>
          )}
        </DialogContent>
      </Dialog>

      {order && showRefundModal && (
        <RefundModal
          order={order}
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
        />
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
              <span className="block mt-2 text-muted-foreground">
                No payments have been processed for this order, so no refund is necessary.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelOrderMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
