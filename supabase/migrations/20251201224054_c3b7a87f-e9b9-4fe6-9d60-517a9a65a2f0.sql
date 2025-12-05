-- Add DELETE policy for market_events
CREATE POLICY "Users can delete market events" 
ON public.market_events 
FOR DELETE 
USING (auth.uid() IS NOT NULL);