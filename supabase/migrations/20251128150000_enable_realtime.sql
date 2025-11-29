-- Enable Realtime for tables (using DO blocks to handle existing memberships)
DO $$
BEGIN
  -- Try to add products table
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Table already in publication
  END;

  -- Try to add product_batches table
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE product_batches;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Table already in publication
  END;

  -- Try to add orders table
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Table already in publication
  END;

  -- Try to add order_items table
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Table already in publication
  END;
END $$;
