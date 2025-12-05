-- Migration 1: Create import_batches table
CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  orders_created integer DEFAULT 0,
  orders_skipped integer DEFAULT 0,
  items_imported integer DEFAULT 0,
  unmatched_products integer DEFAULT 0,
  status text DEFAULT 'processing',
  errors text[],
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS on import_batches
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for import_batches
CREATE POLICY "Users can view all import batches"
  ON public.import_batches FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert import batches"
  ON public.import_batches FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update import batches"
  ON public.import_batches FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Migration 2: Create product_mappings table
CREATE TABLE public.product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_sku text NOT NULL,
  external_name text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  source text DEFAULT 'yoco_import',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(external_sku, source)
);

-- Enable RLS on product_mappings
ALTER TABLE public.product_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_mappings
CREATE POLICY "Users can view all product mappings"
  ON public.product_mappings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert product mappings"
  ON public.product_mappings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update product mappings"
  ON public.product_mappings FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete product mappings"
  ON public.product_mappings FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add updated_at trigger for product_mappings
CREATE TRIGGER update_product_mappings_updated_at
  BEFORE UPDATE ON public.product_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Migration 3: Add import_batch_id to orders table
ALTER TABLE public.orders 
ADD COLUMN import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX idx_orders_import_batch_id ON public.orders(import_batch_id);