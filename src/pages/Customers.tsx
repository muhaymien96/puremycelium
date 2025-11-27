import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, Mail, Phone } from 'lucide-react';

const Customers = () => {
  const navigate = useNavigate();

  const customers = [
    { id: '1', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '+27 82 123 4567', orders: 5 },
    { id: '2', name: 'Michael Chen', email: 'michael@example.com', phone: '+27 83 234 5678', orders: 3 },
    { id: '3', name: 'Emma Williams', email: 'emma@example.com', phone: '+27 84 345 6789', orders: 8 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Customers</h1>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {customers.map((customer) => (
          <Card key={customer.id} className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">{customer.name}</h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{customer.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{customer.orders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default Customers;