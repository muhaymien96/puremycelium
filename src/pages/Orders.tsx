import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Eye, ShoppingCart, ArrowUpDown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOrders } from '@/hooks/useOrders';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderDetailModal } from '@/components/OrderDetailModal';
import { EmptyState } from '@/components/EmptyState';

const ITEMS_PER_PAGE = 10;

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'status';

export default function Orders() {
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useOrders();

  // Reset page when filters update
  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusFilter, sourceFilter, sortBy]);

  const filteredAndSortedOrders = useMemo(() => {
    let result = (orders || []).filter((order: any) => {
      const fullName = order.customers
        ? `${order.customers.first_name} ${order.customers.last_name}`
        : 'Walk-in';

      const matchesSearch =
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fullName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter;

      const matchesSource =
        sourceFilter === 'all' ||
        (sourceFilter === 'yoco_import' && order.external_source === 'yoco_import') ||
        (sourceFilter === 'manual' && !order.external_source);

      return matchesSearch && matchesStatus && matchesSource;
    });

    // Sort
    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount_desc':
          return Number(b.total_amount) - Number(a.total_amount);
        case 'amount_asc':
          return Number(a.total_amount) - Number(b.total_amount);
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

    return result;
  }, [orders, searchQuery, statusFilter, sourceFilter, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedOrders.length / ITEMS_PER_PAGE);
  const pagedOrders = filteredAndSortedOrders.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      delivered: 'bg-green-600/10 text-green-700 border-green-600/20',
      confirmed: 'bg-green-600/10 text-green-700 border-green-600/20',
      pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
      refunded: 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    return map[status] || 'bg-muted text-muted-foreground border-border';
  };

  const getSourceBadge = (src: string | null) =>
    src === 'yoco_import' ? (
      <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/20 text-[10px]">
        Yoco
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-[10px]">
        Manual
      </Badge>
    );

  // Mobile Card Component
  const OrderCard = ({ order }: { order: any }) => (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => setSelectedOrderId(order.id)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium flex items-center gap-2">
              {order.order_number}
              {getSourceBadge(order.external_source)}
            </div>
            <p className="text-sm text-muted-foreground">
              {order.customers
                ? `${order.customers.first_name} ${order.customers.last_name}`
                : 'Walk-in'}
            </p>
          </div>
          <Badge variant="outline" className={getStatusBadge(order.status)}>
            {order.status}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString()}
          </span>
          <span className="font-semibold">
            R {Number(order.total_amount).toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {filteredAndSortedOrders.length} result{filteredAndSortedOrders.length !== 1 && 's'}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order # or customer"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="yoco_import">Yoco</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Newest First</SelectItem>
                    <SelectItem value="date_asc">Oldest First</SelectItem>
                    <SelectItem value="amount_desc">Amount (High-Low)</SelectItem>
                    <SelectItem value="amount_asc">Amount (Low-High)</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : pagedOrders.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {pagedOrders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            <div className="flex gap-2 items-center">
                              {order.order_number}
                              {getSourceBadge(order.external_source)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {order.customers
                              ? `${order.customers.first_name} ${order.customers.last_name}`
                              : 'Walk-in'}
                          </TableCell>
                          <TableCell>
                            R {Number(order.total_amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusBadge(order.status)}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedOrderId(order.id)}
                            >
                              <Eye className="w-4 h-4 mr-2" /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {pagedOrders.map((order: any) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center items-center gap-4 pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </Button>

                  <p className="text-sm">
                    Page {page + 1} of {totalPages}
                  </p>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                icon={ShoppingCart}
                title="No orders found"
                description="Try adjusting filters"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </AppLayout>
  );
}