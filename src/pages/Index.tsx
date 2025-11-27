const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-3xl px-8 text-center">
        <h1 className="mb-6 text-5xl font-bold">🍯🍄 Honey & Mushroom CRM</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Your database schema is ready! Complete backend with 11 tables for managing customers, 
          products, inventory, orders, payments, and market events.
        </p>
        <div className="mt-8 rounded-lg border bg-card p-6 text-left">
          <h2 className="mb-3 text-2xl font-semibold">Database Tables Created:</h2>
          <ul className="grid grid-cols-2 gap-3 text-muted-foreground">
            <li>✓ Profiles (Users)</li>
            <li>✓ Customers</li>
            <li>✓ Products</li>
            <li>✓ Product Batches</li>
            <li>✓ Stock Movements</li>
            <li>✓ Market Events</li>
            <li>✓ Orders</li>
            <li>✓ Order Items</li>
            <li>✓ Payments</li>
            <li>✓ Refunds</li>
            <li>✓ Invoices</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Index;
