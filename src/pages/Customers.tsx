import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Mail, Phone } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';

const Customers = () => {
  const navigate = useNavigate();
  const { data: customers, isLoading } = useCustomers();
  const [showAddCustomer, setShowAddCustomer] = useState(false);

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
              className="hover:bg-accent transition-colors cursor-pointer"
              onClick={() => navigate(`/customers/${customer.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
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
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No customers yet</p>
              <Button onClick={() => setShowAddCustomer(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Customer
              </Button>
            </CardContent>
          </Card>
        )}

        <AddCustomerModal open={showAddCustomer} onOpenChange={setShowAddCustomer} />
      </div>
    </AppLayout>
  );
};

export default Customers;