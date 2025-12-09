import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketEvent {
  id: string;
  name: string;
  location: string;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  is_recurring: boolean | null;
}

interface BusinessSettings {
  business_name: string | null;
  reminder_enabled: boolean | null;
  reminder_days_before: number | null;
  reminder_emails: string[] | null;
  reminder_email_subject: string | null;
  reminder_email_template: string | null;
}

// Format time for display
function formatTime(time: string | null): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Build email HTML for event reminder
function buildReminderEmail(
  event: MarketEvent,
  businessName: string,
  template: string | null
): string {
  const eventDateFormatted = formatDate(event.event_date);
  const endDateFormatted = event.end_date ? formatDate(event.end_date) : null;
  const timeRange = event.start_time 
    ? `${formatTime(event.start_time)}${event.end_time ? ` - ${formatTime(event.end_time)}` : ''}`
    : 'Time not specified';

  // If custom template provided, replace placeholders
  if (template) {
    return template
      .replace(/{{event_name}}/g, event.name)
      .replace(/{{event_location}}/g, event.location)
      .replace(/{{event_date}}/g, eventDateFormatted)
      .replace(/{{event_end_date}}/g, endDateFormatted || eventDateFormatted)
      .replace(/{{event_time}}/g, timeRange)
      .replace(/{{event_notes}}/g, event.notes || '')
      .replace(/{{business_name}}/g, businessName);
  }

  // Default email template
  const isMultiDay = event.end_date && event.end_date !== event.event_date;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📅 Upcoming Event Reminder</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: #1f2937; margin-top: 0;">${event.name}</h2>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            <strong style="color: #6b7280;">📍 Location</strong>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${event.location}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            <strong style="color: #6b7280;">📆 Date${isMultiDay ? 's' : ''}</strong>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${eventDateFormatted}${isMultiDay ? `<br><small>to ${endDateFormatted}</small>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">
            <strong style="color: #6b7280;">⏰ Time</strong>
          </td>
          <td style="padding: 10px 0; text-align: right;">
            ${timeRange}
          </td>
        </tr>
      </table>
    </div>
    
    ${event.notes ? `
    <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
      <strong style="color: #92400e;">📝 Notes:</strong>
      <p style="color: #92400e; margin: 5px 0 0 0;">${event.notes}</p>
    </div>
    ` : ''}
    
    <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
      This is an automated reminder from ${businessName}.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>Sent by ${businessName}</p>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get business settings for reminder configuration
    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('business_name, reminder_enabled, reminder_days_before, reminder_emails, reminder_email_subject, reminder_email_template')
      .eq('is_default', true)
      .single();

    if (settingsError) {
      console.error('Failed to fetch business settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const businessSettings = settings as BusinessSettings;

    // Check if reminders are enabled
    if (!businessSettings.reminder_enabled) {
      console.log('Event reminders are disabled');
      return new Response(
        JSON.stringify({ message: 'Reminders disabled', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate reminder emails
    const recipientEmails = businessSettings.reminder_emails || [];
    if (recipientEmails.length === 0) {
      console.log('No reminder email addresses configured');
      return new Response(
        JSON.stringify({ message: 'No recipient emails configured', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const daysBefore = businessSettings.reminder_days_before || 1;
    const businessName = businessSettings.business_name || 'Business';

    // Calculate target date (events happening in X days)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBefore);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    console.log(`Looking for events on ${targetDateStr} (${daysBefore} day(s) from now)`);

    // Find events that start on the target date
    // Also find multi-day events where target date falls within their range
    const { data: upcomingEvents, error: eventsError } = await supabase
      .from('market_events')
      .select('id, name, location, event_date, end_date, start_time, end_time, notes, is_recurring')
      .or(`event_date.eq.${targetDateStr},and(event_date.lte.${targetDateStr},end_date.gte.${targetDateStr})`);

    if (eventsError) {
      console.error('Failed to fetch events:', eventsError);
      throw eventsError;
    }

    // Filter to only events starting on target date (not ongoing multi-day events)
    const eventsStartingOnTarget = (upcomingEvents || []).filter(
      (e: MarketEvent) => e.event_date === targetDateStr
    );

    console.log(`Found ${eventsStartingOnTarget.length} events starting on ${targetDateStr}`);

    if (eventsStartingOnTarget.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No events to remind about', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which reminders have already been sent
    const eventIds = eventsStartingOnTarget.map((e: MarketEvent) => e.id);
    const { data: alreadySent } = await supabase
      .from('event_reminders_sent')
      .select('event_id, sent_to')
      .in('event_id', eventIds);

    const sentSet = new Set(
      (alreadySent || []).map(r => `${r.event_id}|${r.sent_to}`)
    );

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Send reminder for each event to each recipient
    for (const event of eventsStartingOnTarget as MarketEvent[]) {
      for (const email of recipientEmails) {
        const key = `${event.id}|${email}`;
        
        if (sentSet.has(key)) {
          console.log(`Skipping already sent: ${event.name} to ${email}`);
          skippedCount++;
          continue;
        }

        try {
          const subject = businessSettings.reminder_email_subject
            ? businessSettings.reminder_email_subject.replace(/{{event_name}}/g, event.name)
            : `Reminder: ${event.name} - ${formatDate(event.event_date)}`;

          const html = buildReminderEmail(
            event,
            businessName,
            businessSettings.reminder_email_template
          );

          await resend.emails.send({
            from: `${businessName} <noreply@resend.dev>`,
            to: [email],
            subject,
            html,
          });

          // Record that we sent this reminder
          await supabase
            .from('event_reminders_sent')
            .insert({
              event_id: event.id,
              sent_to: email,
            });

          console.log(`Sent reminder for ${event.name} to ${email}`);
          sentCount++;
        } catch (emailError: any) {
          console.error(`Failed to send to ${email}:`, emailError);
          errors.push(`Failed to send ${event.name} to ${email}: ${emailError.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${sentCount} reminders, skipped ${skippedCount} already sent`,
        sent: sentCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-event-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
