import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Invoices = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoices', statusFilter, deliveryStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (deliveryStatusFilter !== 'all') params.append('delivery_status', deliveryStatusFilter);

      const { data, error } = await supabase.functions.invoke('invoices', {
        method: 'GET',
      });

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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-foreground">Invoices</h1>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="w-48">
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

          <div className="w-48">
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
        <div className="rounded-lg border bg-card">
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : !data?.data || data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((invoice: any) => (
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(invoice.pdf_url, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {invoice.pdf_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(invoice.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info("Order view coming soon")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Invoices;