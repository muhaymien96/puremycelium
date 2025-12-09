-- Migration: Multi-day and recurring events support
-- Adds end_date, recurrence fields to market_events
-- Creates event_days table for per-day time configuration
-- Adds notification settings to business_settings

-- Add new columns to market_events for multi-day and recurring support
ALTER TABLE public.market_events
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES public.market_events(id) ON DELETE SET NULL;

-- Comment on new columns
COMMENT ON COLUMN public.market_events.end_date IS 'End date for multi-day events. If NULL, event is single-day (uses event_date only)';
COMMENT ON COLUMN public.market_events.is_recurring IS 'Whether this event recurs on a schedule';
COMMENT ON COLUMN public.market_events.recurrence_pattern IS 'JSON object describing recurrence: { type: "weekly" | "monthly", weekdays?: number[], weekOfMonth?: "first" | "second" | "third" | "fourth" | "last", dayOfMonth?: number }';
COMMENT ON COLUMN public.market_events.parent_event_id IS 'For generated recurring instances, links back to the parent recurring event';

-- Create event_days table for per-day time configuration
CREATE TABLE IF NOT EXISTS public.event_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.market_events(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, day_date)
);

-- Add RLS policies for event_days
ALTER TABLE public.event_days ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read event_days
CREATE POLICY "Authenticated users can view event_days" ON public.event_days
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert event_days
CREATE POLICY "Authenticated users can create event_days" ON public.event_days
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update event_days
CREATE POLICY "Authenticated users can update event_days" ON public.event_days
  FOR UPDATE TO authenticated USING (true);

-- Allow authenticated users to delete event_days
CREATE POLICY "Authenticated users can delete event_days" ON public.event_days
  FOR DELETE TO authenticated USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_days_event_id ON public.event_days(event_id);
CREATE INDEX IF NOT EXISTS idx_event_days_day_date ON public.event_days(day_date);
CREATE INDEX IF NOT EXISTS idx_market_events_date_range ON public.market_events(event_date, end_date);
CREATE INDEX IF NOT EXISTS idx_market_events_parent ON public.market_events(parent_event_id);

-- Add notification settings columns to business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS reminder_emails TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS reminder_email_subject TEXT DEFAULT 'Upcoming Event Reminder: {event_name}',
ADD COLUMN IF NOT EXISTS reminder_email_template TEXT DEFAULT 'You have an upcoming event:\n\nEvent: {event_name}\nDate: {event_date}\nLocation: {location}\nTime: {start_time} - {end_time}\n\nNotes: {notes}';

COMMENT ON COLUMN public.business_settings.reminder_enabled IS 'Whether event reminders are enabled';
COMMENT ON COLUMN public.business_settings.reminder_days_before IS 'Number of days before event to send reminder';
COMMENT ON COLUMN public.business_settings.reminder_emails IS 'Array of email addresses to receive reminders';
COMMENT ON COLUMN public.business_settings.reminder_email_subject IS 'Email subject template with placeholders';
COMMENT ON COLUMN public.business_settings.reminder_email_template IS 'Email body template with placeholders';

-- Create sent_reminders table to track what reminders have been sent
CREATE TABLE IF NOT EXISTS public.event_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.market_events(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipient_emails TEXT[],
  UNIQUE(event_id, reminder_date)
);

-- RLS for event_reminders_sent
ALTER TABLE public.event_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sent reminders" ON public.event_reminders_sent
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert sent reminders" ON public.event_reminders_sent
  FOR INSERT TO authenticated WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_days_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for event_days updated_at
DROP TRIGGER IF EXISTS update_event_days_updated_at ON public.event_days;
CREATE TRIGGER update_event_days_updated_at
  BEFORE UPDATE ON public.event_days
  FOR EACH ROW
  EXECUTE FUNCTION update_event_days_updated_at();

-- Enable realtime for event_days
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_days;
