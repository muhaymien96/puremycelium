import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { MarketEvent } from '@/hooks/useMarketEvents';
import { format, isSameDay, parseISO, isWithinInterval, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventCalendarProps {
  events: MarketEvent[];
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
}

// Helper to format time for display
function formatTime(time: string | null): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function EventCalendar({ events, selectedDate, onSelectDate }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Build a map of dates to events (handling multi-day events)
  const eventsByDate = useMemo(() => {
    const dateMap = new Map<string, { event: MarketEvent; isStart: boolean; isEnd: boolean; isMiddle: boolean }[]>();
    
    events.forEach(event => {
      const startDate = parseISO(event.event_date);
      const endDate = (event as any).end_date ? parseISO((event as any).end_date) : startDate;
      
      // Get all days in the event range
      const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });
      
      daysInRange.forEach((day, index) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const isStart = index === 0;
        const isEnd = index === daysInRange.length - 1;
        const isMiddle = !isStart && !isEnd;
        
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey)!.push({ event, isStart, isEnd, isMiddle });
      });
    });
    
    return dateMap;
  }, [events]);

  const eventsOnDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  };

  const modifiers = {
    hasEvents: (date: Date) => eventsOnDate(date).length > 0,
    isEventStart: (date: Date) => eventsOnDate(date).some(e => e.isStart),
    isEventEnd: (date: Date) => eventsOnDate(date).some(e => e.isEnd),
    isEventMiddle: (date: Date) => eventsOnDate(date).some(e => e.isMiddle),
    isMultiDay: (date: Date) => eventsOnDate(date).some(e => !e.isStart || !e.isEnd),
  };

  const modifiersClassNames = {
    hasEvents: 'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary',
    isEventStart: 'bg-primary/20 rounded-l-md rounded-r-none',
    isEventEnd: 'bg-primary/20 rounded-r-md rounded-l-none',
    isEventMiddle: 'bg-primary/10 rounded-none',
    isMultiDay: '',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newMonth = new Date(currentMonth);
              newMonth.setMonth(currentMonth.getMonth() - 1);
              setCurrentMonth(newMonth);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newMonth = new Date(currentMonth);
              newMonth.setMonth(currentMonth.getMonth() + 1);
              setCurrentMonth(newMonth);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onSelectDate}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        className="rounded-md border w-full"
      />

      {selectedDate && eventsOnDate(selectedDate).length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {format(selectedDate, 'MMMM d, yyyy')}
          </p>
          {eventsOnDate(selectedDate).map(({ event, isStart, isEnd }) => {
            const endDate = (event as any).end_date;
            const isMultiDay = endDate && endDate !== event.event_date;
            const isRecurring = (event as any).is_recurring;
            
            return (
              <div 
                key={event.id} 
                className={cn(
                  "flex items-center justify-between p-2 rounded-md",
                  isMultiDay && isStart && "bg-primary/10 border-l-4 border-l-primary",
                  isMultiDay && isEnd && "bg-primary/10 border-r-4 border-r-primary",
                  isMultiDay && !isStart && !isEnd && "bg-muted/30",
                  !isMultiDay && "bg-muted/50"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{event.name}</p>
                    {isRecurring && (
                      <Repeat className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                    {isMultiDay && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 flex-shrink-0">
                        {isStart ? 'Start' : isEnd ? 'End' : 'Day'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                  {isMultiDay && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(parseISO(event.event_date), 'MMM d')} – {format(parseISO(endDate), 'MMM d')}
                    </p>
                  )}
                </div>
                {event.start_time && (
                  <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                    {formatTime(event.start_time)}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
