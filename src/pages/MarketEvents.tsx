import { useState, useMemo } from 'react';
import { format as formatDate, parse } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMarketEvents, useDeleteMarketEvent, MarketEvent } from '@/hooks/useMarketEvents';
import { useMonthlyEventProfitability } from '@/hooks/useEventProfitability';
import { useEventSales } from '@/hooks/useEventSales';
import { Badge } from '@/components/ui/badge';
import { AddMarketEventModal } from '@/components/AddMarketEventModal';
import { EditMarketEventModal } from '@/components/EditMarketEventModal';
import { EventCalendar } from '@/components/EventCalendar';
import { EventDayDrawer } from '@/components/EventDayDrawer';
import { Plus, TrendingUp, Banknote, Coins, Calendar as CalendarIcon, Edit, Trash2, ShoppingBag, Package } from 'lucide-react';
import { isSameDay, parseISO, isWithinInterval, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Helper to check if a date falls within an event's date range
function isDateInEventRange(date: Date, event: MarketEvent): boolean {
  const startDate = parseISO(event.event_date);
  const endDate = (event as any).end_date ? parseISO((event as any).end_date) : startDate;
  
  // Use isWithinInterval for range check (inclusive)
  return isWithinInterval(date, { start: startDate, end: endDate }) || 
         isSameDay(date, startDate) || 
         isSameDay(date, endDate);
}

const MarketEvents = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MarketEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showDayDrawer, setShowDayDrawer] = useState(false);
  
  const { data: events, isLoading } = useMarketEvents();
  const deleteEvent = useDeleteMarketEvent();

  // Fetch event_days for per-day time display
  const { data: allEventDays } = useQuery({
    queryKey: ['all-event-days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_days')
        .select('*')
        .order('day_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Update KPIs for selected month/year
  const { data: monthlyStats } = useMonthlyEventProfitability(
    selectedYear,
    selectedMonth
  );

  // Filter events for selected date (including multi-day events)
  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate || !events) return [];
    return events.filter(e => isDateInEventRange(selectedDate, e));
  }, [selectedDate, events]);

  // Get the specific day's times for an event on the selected date
  const getEventDayTimes = (eventId: string, date: Date) => {
    if (!allEventDays) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    return allEventDays.find(ed => ed.event_id === eventId && ed.day_date === dateStr);
  };

  const handleEdit = (event: MarketEvent) => {
    setSelectedEvent(event);
    setShowEditModal(true);
    setShowDayDrawer(false);
  };

  const handleDelete = async () => {
    if (eventToDelete) {
      await deleteEvent.mutateAsync(eventToDelete);
      setEventToDelete(null);
      setShowDayDrawer(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // Only open drawer if there are no events for this date (checking date range)
      const hasEvents = events?.some(e => isDateInEventRange(date, e));
      if (!hasEvents) {
        setShowDayDrawer(true);
      }
    }
  };

  const handleAddEventForDate = (dateString: string) => {
    setShowAddModal(true);
    setShowDayDrawer(false);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-2xl font-bold">Events</h1>
            <p className="text-sm text-muted-foreground">
              Manage your market and event schedule
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </motion.div>

        {/* Monthly Summary with Month Selector */}
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-lg font-semibold">This Month’s Event KPIs</h2>
          <div className="flex gap-2 items-center">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {formatDate(new Date(2000, i, 1), 'MMMM')}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>{year}</option>
                );
              })}
            </select>
          </div>
        </div>
        {monthlyStats && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="text-xs">Events</span>
                </div>
                <p className="text-2xl font-bold">{monthlyStats.eventCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Banknote className="h-4 w-4" />
                  <span className="text-xs">Revenue</span>
                </div>
                <p className="text-2xl font-bold">R {monthlyStats.totalRevenue.toFixed(0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Coins className="h-4 w-4" />
                  <span className="text-xs">Costs</span>
                </div>
                <p className="text-2xl font-bold">R {monthlyStats.totalCosts.toFixed(0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Profit</span>
                </div>
                <p className={`text-2xl font-bold ${monthlyStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R {monthlyStats.profit.toFixed(0)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-[400px_1fr] gap-6">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-[400px_1fr] gap-6"
          >
            {/* Calendar on left for desktop, top for mobile */}
            <div className="order-1">
              <EventCalendar
                events={events || []}
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
              />
            </div>

            {/* Event List on right for desktop, below for mobile */}
            <div className="order-2">
              <Card>
                <CardContent className="p-6">
                  {selectedDate ? (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">
                        Events on {selectedDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h3>
                      {eventsForSelectedDate.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No events scheduled for this day</p>
                          <Button 
                            onClick={() => handleAddEventForDate(selectedDate.toISOString().split('T')[0])} 
                            className="mt-4"
                            variant="outline"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Event
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {eventsForSelectedDate.map(event => {
                            const EventCard = () => {
                              const totalCosts = (event.stall_fee || 0) + (event.travel_cost || 0) + (event.other_costs || 0);
                              const { data: salesData } = useEventSales(event.id);
                              
                              // Get per-day times if available
                              const dayTimes = getEventDayTimes(event.id, selectedDate!);
                              const displayStartTime = dayTimes?.start_time || event.start_time;
                              const displayEndTime = dayTimes?.end_time || event.end_time;
                              const profit = (salesData?.totalRevenue || 0) - totalCosts;
                              
                              return (
                                <Card key={event.id} className="border">
                                  <CardContent className="p-4 space-y-2">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-semibold">{event.name}</h4>
                                          <Badge variant="outline" className="text-xs">
                                            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse" />
                                            Live
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{event.location}</p>
                                        {displayStartTime && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {displayStartTime}{displayEndTime && ` - ${displayEndTime}`}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          onClick={() => handleEdit(event)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => setEventToDelete(event.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Sales Summary */}
                                    {salesData && salesData.orderCount > 0 && (
                                      <div className="pt-2 border-t space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <ShoppingBag className="h-3.5 w-3.5" />
                                            <span>Sales:</span>
                                          </div>
                                          <span className="font-semibold">
                                            {salesData.orderCount} {salesData.orderCount === 1 ? 'order' : 'orders'} | R {salesData.totalRevenue.toFixed(2)}
                                          </span>
                                        </div>

                                        {/* Top Sellers */}
                                        {salesData.topSellers.length > 0 && (
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                              <Package className="h-3 w-3" />
                                              <span>Top Sellers:</span>
                                            </div>
                                            {salesData.topSellers.map((seller, idx) => (
                                              <div key={seller.product_name} className="text-xs pl-5 flex justify-between">
                                                <span className="text-muted-foreground">
                                                  {idx + 1}. {seller.product_name}
                                                </span>
                                                <span className="font-medium">
                                                  {seller.quantity} units (R{seller.revenue.toFixed(0)})
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between pt-2 border-t text-sm">
                                      <span className="text-muted-foreground">Total Costs:</span>
                                      <span className="font-semibold">R {totalCosts.toFixed(2)}</span>
                                    </div>

                                    {salesData && salesData.orderCount > 0 && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Profit:</span>
                                        <span className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          R {profit.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {event.notes && (
                                      <p className="text-xs text-muted-foreground pt-2 border-t">
                                        {event.notes}
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            };
                            return <EventCard key={event.id} />;
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a date to view events</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Mobile Day Drawer */}
        <EventDayDrawer
          open={showDayDrawer}
          onOpenChange={setShowDayDrawer}
          selectedDate={selectedDate}
          events={events || []}
          onAddEvent={handleAddEventForDate}
          onEditEvent={handleEdit}
          onDeleteEvent={(id) => setEventToDelete(id)}
        />

        <AddMarketEventModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
        />

        <EditMarketEventModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          event={selectedEvent}
        />

        <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this event? This action cannot be undone.
                Any sales linked to this event will remain but will no longer be associated with it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Mobile FAB */}
        <Button 
          onClick={() => setShowAddModal(true)}
          className="md:hidden fixed bottom-20 right-4 rounded-full h-14 w-14 shadow-lg"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </AppLayout>
  );
};

export default MarketEvents;
