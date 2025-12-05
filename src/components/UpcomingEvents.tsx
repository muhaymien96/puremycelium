import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpcomingMarketEvents } from '@/hooks/useMarketEvents';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

export function UpcomingEvents() {
  const { data: events, isLoading } = useUpcomingMarketEvents(3);

  const formatTime = (time: string | null) => {
    if (!time) return null;
    return time.substring(0, 5); // HH:MM
  };

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border rounded-lg p-3 hover:shadow-sm transition-shadow bg-card"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(event.event_date), 'MMM dd, yyyy')}</span>
                    </div>
                    {(event.start_time || event.end_time) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTime(event.start_time)}
                          {event.end_time && ` - ${formatTime(event.end_time)}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming events scheduled
          </p>
        )}
      </CardContent>
    </Card>
  );
}
