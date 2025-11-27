import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";

const Invoices = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>("all");

  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ['invoices', statusFilter, deliveryStatusFilter],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customers (first_name, last_name, email),
          orders (order_number)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (deliveryStatusFilter !== 'all') {
        query = query.eq('delivery_status', deliveryStatusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const handleResend = async (invoiceId: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-invoice', {
        body: { invoice_id: invoiceId }
      });

      if (error) throw error;

      toast.success("Invoice resent successfully");
      refetch();
    } catch (error) {
      console.error('Error resending invoice:', error);
      toast.error("Failed to resend invoice");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'paid': 'default',
      'unpaid': 'secondary',
      'overdue': 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getDeliveryStatusBadge = (deliveryStatus: string) => {
    const config = {
      'pending': { variant: 'secondary', emoji: '⏳' },
      'generated': { variant: 'default', emoji: '📄' },
      'sent': { variant: 'default', emoji: '✅' },
      'failed': { variant: 'destructive', emoji: '❌' },
    } as const;

    const { variant, emoji } = config[deliveryStatus as keyof typeof config] || config.pending;

    return (
      <Badge variant={variant as "default" | "secondary" | "destructive"}>
        {emoji} {deliveryStatus.toUpperCase()}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-sm text-muted-foreground">View and manage all invoices</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-48">
            <Select value={deliveryStatusFilter} onValueChange={setDeliveryStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Delivery Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Delivery</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !invoices || invoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices found"
                description={statusFilter !== 'all' || deliveryStatusFilter !== 'all'
                  ? "Try adjusting your filters to see more results"
                  : "Invoices will be generated automatically when orders are paid"}
                actionLabel={statusFilter === 'all' && deliveryStatusFilter === 'all' ? "Create New Sale" : undefined}
                onAction={statusFilter === 'all' && deliveryStatusFilter === 'all' ? () => navigate('/sale') : undefined}
              />
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Delivery Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice: any) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {invoice.customers 
                              ? `${invoice.customers.first_name} ${invoice.customers.last_name}`
                              : 'Walk-in'}
                          </TableCell>
                          <TableCell>R {parseFloat(invoice.total_amount).toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell>{getDeliveryStatusBadge(invoice.delivery_status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {invoice.pdf_url && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(invoice.pdf_url, '_blank')}
                                    title="Download PDF"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResend(invoice.id)}
                                    title="Resend Invoice"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/orders`)}
                                title="View Order"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden p-4 space-y-3">
                  {invoices.map((invoice: any) => (
                    <Card key={invoice.id} className="cursor-pointer hover:bg-muted/50" onClick={() => invoice.pdf_url && window.open(invoice.pdf_url, '_blank')}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{invoice.invoice_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {invoice.customers 
                                ? `${invoice.customers.first_name} ${invoice.customers.last_name}`
                                : 'Walk-in'}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {getStatusBadge(invoice.status)}
                            {getDeliveryStatusBadge(invoice.delivery_status)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">
                            {new Date(invoice.invoice_date).toLocaleDateString()}
                          </p>
                          <p className="font-bold">R {parseFloat(invoice.total_amount).toFixed(2)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Invoices;