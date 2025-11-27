import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Mail, Phone, Users, Trash2 } from 'lucide-react';
import { useCustomers, useDeleteCustomer } from '@/hooks/useCustomers';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const Customers = () => {
  const navigate = useNavigate();
  const { data: customers, isLoading } = useCustomers();
  const deleteCustomer = useDeleteCustomer();
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-sm text-muted-foreground">Manage your customer relationships</p>
          </div>
          <Button size="sm" onClick={() => setShowAddCustomer(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : customers && customers.length > 0 ? (
          customers.map((customer) => (
            <Card 
              key={customer.id} 
              className="hover:bg-accent transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    <h3 className="font-semibold mb-2">
                      {customer.first_name} {customer.last_name}
                    </h3>
                    <div className="space-y-1">
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerToDelete(customer);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Start building your customer base by adding your first customer"
            actionLabel="Add Customer"
            onAction={() => setShowAddCustomer(true)}
          />
        )}

        <AddCustomerModal open={showAddCustomer} onOpenChange={setShowAddCustomer} />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{customerToDelete?.first_name} {customerToDelete?.last_name}"? This action cannot be undone and will remove all customer data and history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (customerToDelete) {
                    deleteCustomer.mutate(customerToDelete.id);
                    setCustomerToDelete(null);
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default Customers;