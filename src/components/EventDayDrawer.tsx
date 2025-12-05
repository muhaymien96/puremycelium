import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarketEvent } from '@/hooks/useMarketEvents';
import { format } from 'date-fns';
import { MapPin, Clock, Plus, Edit, Trash2 } from 'lucide-react';

interface EventDayDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | undefined;
  events: MarketEvent[];
  onAddEvent: (date: string) => void;
  onEditEvent: (event: MarketEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

export function EventDayDrawer({ 
  open, 
  onOpenChange, 
  selectedDate, 
  events,
  onAddEvent,
  onEditEvent,
  onDeleteEvent 
}: EventDayDrawerProps) {
  if (!selectedDate) return null;

  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const eventsForDay = events.filter(e => e.event_date === dateString);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</DrawerTitle>
        </DrawerHeader>
        
        <div className="p-4 space-y-4 overflow-y-auto">
          <Button 
            onClick={() => onAddEvent(dateString)} 
            className="w-full"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event for This Day
          </Button>

          {eventsForDay.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No events scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventsForDay.map(event => {
                const totalCosts = (event.stall_fee || 0) + (event.travel_cost || 0) + (event.other_costs || 0);
                
                return (
                  <div key={event.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{event.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{event.location}</span>
                        </div>
                        {event.start_time && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {event.start_time}
                              {event.end_time && ` - ${event.end_time}`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => onEditEvent(event)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDeleteEvent(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {totalCosts > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Total Costs:</span>
                        <Badge variant="outline">R {totalCosts.toFixed(2)}</Badge>
                      </div>
                    )}

                    {event.notes && (
                      <p className="text-sm text-muted-foreground pt-2 border-t">
                        {event.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
