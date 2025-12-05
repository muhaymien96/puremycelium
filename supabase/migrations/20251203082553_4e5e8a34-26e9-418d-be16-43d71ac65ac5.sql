-- Create expense_type enum
CREATE TYPE public.expense_type AS ENUM ('event', 'supplies', 'marketing', 'operational', 'other');

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_type public.expense_type NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  notes TEXT,
  market_event_id UUID REFERENCES public.market_events(id) ON DELETE SET NULL,
  receipt_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all expenses" ON public.expenses
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert expenses" ON public.expenses
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update expenses" ON public.expenses
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete expenses" ON public.expenses
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add receipt_footer_text to business_settings
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS receipt_footer_text TEXT DEFAULT 'Thank you for your purchase!';

-- Create trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();