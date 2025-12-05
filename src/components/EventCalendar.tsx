import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { MarketEvent } from '@/hooks/useMarketEvents';
import { format, isSameDay } from 'date-fns';

interface EventCalendarProps {
  events: MarketEvent[];
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
}

export function EventCalendar({ events, selectedDate, onSelectDate }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const eventsOnDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.event_date), date)
    );
  };

  const modifiers = {
    hasEvents: (date: Date) => eventsOnDate(date).length > 0,
  };

  const modifiersClassNames = {
    hasEvents: 'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary',
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
          {eventsOnDate(selectedDate).map(event => (
            <div key={event.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <div>
                <p className="font-medium text-sm">{event.name}</p>
                <p className="text-xs text-muted-foreground">{event.location}</p>
              </div>
              {event.start_time && (
                <Badge variant="outline" className="text-xs">
                  {event.start_time}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
