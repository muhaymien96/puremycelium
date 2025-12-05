-- Add cost tracking columns to market_events table
ALTER TABLE public.market_events
ADD COLUMN stall_fee numeric DEFAULT 0,
ADD COLUMN travel_cost numeric DEFAULT 0,
ADD COLUMN other_costs numeric DEFAULT 0,
ADD COLUMN cost_notes text;

-- Add comment for documentation
COMMENT ON COLUMN public.market_events.stall_fee IS 'Cost of stall/booth at the market event';
COMMENT ON COLUMN public.market_events.travel_cost IS 'Travel expenses for the market event';
COMMENT ON COLUMN public.market_events.other_costs IS 'Other miscellaneous costs for the market event';
COMMENT ON COLUMN public.market_events.cost_notes IS 'Additional notes about event costs';