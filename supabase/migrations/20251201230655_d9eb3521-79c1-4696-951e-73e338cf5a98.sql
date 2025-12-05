-- Create business_settings table for invoice customization
CREATE TABLE IF NOT EXISTS public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text,
  logo_url text,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'South Africa',
  phone text,
  email text,
  vat_number text,
  bank_name text,
  bank_account_number text,
  bank_branch_code text,
  invoice_footer_text text DEFAULT 'Thank you for your business!',
  primary_color text DEFAULT '#ea384c',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can view, only admins can modify
CREATE POLICY "Anyone authenticated can view business settings"
  ON public.business_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert business settings"
  ON public.business_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update business settings"
  ON public.business_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for business assets (logo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for business assets
CREATE POLICY "Anyone can view business assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'business-assets');

CREATE POLICY "Admins can upload business assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'business-assets' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update business assets"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'business-assets' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete business assets"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'business-assets' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Insert default business settings
INSERT INTO public.business_settings (
  business_name,
  email,
  invoice_footer_text,
  primary_color
) VALUES (
  'Revono',
  'info@revono.co.za',
  'Thank you for your business!',
  '#ea384c'
) ON CONFLICT DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();