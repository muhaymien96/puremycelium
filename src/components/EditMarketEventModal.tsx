import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { TimePicker, TimePickerInline } from '@/components/ui/time-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useUpdateMarketEvent, MarketEvent } from '@/hooks/useMarketEvents';
import { useIsMobile } from '@/hooks/use-mobile';
import { CalendarIcon, ChevronDown, ChevronUp, Repeat } from 'lucide-react';
import { format, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface EditMarketEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: MarketEvent | null;
}

type RecurrenceType = 'none' | 'weekly' | 'monthly';
type WeekOfMonth = 'first' | 'second' | 'third' | 'fourth' | 'last';

interface RecurrencePattern {
  type: RecurrenceType;
  weekdays?: number[];
  weekOfMonth?: WeekOfMonth;
}

interface DaySchedule {
  date: Date;
  startTime: string | null;
  endTime: string | null;
}

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export function EditMarketEventModal({ open, onOpenChange, event }: EditMarketEventModalProps) {
  const isMobile = useIsMobile();
  
  // Basic event info
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  
  // Date selection
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Per-day schedules
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([]);
  const [useUniformTime, setUseUniformTime] = useState(true);
  const [uniformStartTime, setUniformStartTime] = useState<string | null>(null);
  const [uniformEndTime, setUniformEndTime] = useState<string | null>(null);
  
  // Recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([6]);
  const [weekOfMonth, setWeekOfMonth] = useState<WeekOfMonth>('first');
  
  // Costs
  const [showCosts, setShowCosts] = useState(false);
  const [stallFee, setStallFee] = useState('');
  const [travelCost, setTravelCost] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [costNotes, setCostNotes] = useState('');

  const updateEvent = useUpdateMarketEvent();

  // Fetch existing event_days if multi-day
  const { data: existingEventDays } = useQuery({
    queryKey: ['event-days', event?.id],
    queryFn: async () => {
      if (!event?.id) return [];
      const { data, error } = await supabase
        .from('event_days')
        .select('*')
        .eq('event_id', event.id)
        .order('day_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!event?.id && open,
  });

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      setName(event.name);
      setLocation(event.location);
      setNotes(event.notes || '');
      
      const startDate = parseISO(event.event_date);
      const endDate = (event as any).end_date ? parseISO((event as any).end_date) : undefined;
      setDateRange({ from: startDate, to: endDate });
      
      setUniformStartTime(event.start_time || null);
      setUniformEndTime(event.end_time || null);
      
      const isRec = (event as any).is_recurring || false;
      setIsRecurring(isRec);
      
      const pattern = (event as any).recurrence_pattern as RecurrencePattern | null;
      if (pattern) {
        setRecurrenceType(pattern.type || 'weekly');
        setSelectedWeekdays(pattern.weekdays || [6]);
        setWeekOfMonth(pattern.weekOfMonth || 'first');
      }
      
      // Set costs
      setStallFee(event.stall_fee?.toString() || '');
      setTravelCost(event.travel_cost?.toString() || '');
      setOtherCosts(event.other_costs?.toString() || '');
      setCostNotes(event.cost_notes || '');
      setShowCosts(!!event.stall_fee || !!event.travel_cost || !!event.other_costs);
    }
  }, [event]);

  // Update day schedules from existing event_days
  useEffect(() => {
    if (existingEventDays && existingEventDays.length > 0) {
      const schedules = existingEventDays.map((ed: any) => ({
        date: parseISO(ed.day_date),
        startTime: ed.start_time,
        endTime: ed.end_time,
      }));
      setDaySchedules(schedules);
      
      // Check if times differ across days
      const firstStart = schedules[0]?.startTime;
      const firstEnd = schedules[0]?.endTime;
      const allSame = schedules.every((s: DaySchedule) => s.startTime === firstStart && s.endTime === firstEnd);
      setUseUniformTime(allSame);
    }
  }, [existingEventDays]);

  // Calculate days in the selected range
  const daysInRange = useMemo(() => {
    if (!dateRange?.from) return [];
    const endDate = dateRange.to || dateRange.from;
    return eachDayOfInterval({ start: dateRange.from, end: endDate });
  }, [dateRange]);

  // Update day schedules when date range changes (but preserve existing times)
  useEffect(() => {
    if (daysInRange.length > 0) {
      setDaySchedules(prev => {
        const newSchedules: DaySchedule[] = daysInRange.map(date => {
          const existing = prev.find(d => isSameDay(d.date, date));
          return existing || { date, startTime: uniformStartTime, endTime: uniformEndTime };
        });
        return newSchedules;
      });
    } else {
      setDaySchedules([]);
    }
  }, [daysInRange]);

  const isMultiDay = daysInRange.length > 1;

  const updateDaySchedule = (date: Date, field: 'startTime' | 'endTime', value: string | null) => {
    setDaySchedules(prev => 
      prev.map(d => 
        isSameDay(d.date, date) ? { ...d, [field]: value } : d
      )
    );
  };

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event || !name || !location || !dateRange?.from) {
      return;
    }

    const eventDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : null;
    
    let recurrencePattern: RecurrencePattern | null = null;
    if (isRecurring) {
      recurrencePattern = {
        type: recurrenceType,
        weekdays: recurrenceType === 'weekly' ? selectedWeekdays : undefined,
        weekOfMonth: recurrenceType === 'monthly' ? weekOfMonth : undefined,
      };
    }

    try {
      await updateEvent.mutateAsync({
        id: event.id,
        updates: {
          name,
          location,
          event_date: eventDate,
          end_date: endDate,
          start_time: useUniformTime ? uniformStartTime : (daySchedules[0]?.startTime || null),
          end_time: useUniformTime ? uniformEndTime : (daySchedules[0]?.endTime || null),
          notes: notes || null,
          stall_fee: stallFee ? Number(stallFee) : null,
          travel_cost: travelCost ? Number(travelCost) : null,
          other_costs: otherCosts ? Number(otherCosts) : null,
          cost_notes: costNotes || null,
          is_recurring: isRecurring,
          recurrence_pattern: recurrencePattern as any,
        },
      });

      // Update event_days
      // First delete existing
      await supabase
        .from('event_days')
        .delete()
        .eq('event_id', event.id);

      // Then insert new ones if multi-day
      if (isMultiDay && daySchedules.length > 0) {
        const eventDaysData = daySchedules.map(d => ({
          event_id: event.id,
          day_date: format(d.date, 'yyyy-MM-dd'),
          start_time: useUniformTime ? uniformStartTime : d.startTime,
          end_time: useUniformTime ? uniformEndTime : d.endTime,
        }));

        await supabase
          .from('event_days')
          .insert(eventDaysData);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const FormContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="edit-name">Event Name *</Label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Saturday Farmers Market"
            required
          />
        </div>

        <div>
          <Label htmlFor="edit-location">Location *</Label>
          <Input
            id="edit-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., City Center Square"
            required
          />
        </div>
      </div>

      {/* Date Selection */}
      <div className="space-y-2">
        <Label>Event Date(s) *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateRange?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'MMM d, yyyy')} – {format(dateRange.to, 'MMM d, yyyy')}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({daysInRange.length} days)
                    </span>
                  </>
                ) : (
                  format(dateRange.from, 'MMMM d, yyyy')
                )
              ) : (
                "Select date or date range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={isMobile ? 1 : 2}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Event Times</Label>
          {isMultiDay && (
            <div className="flex items-center gap-2">
              <Label htmlFor="edit-uniform-time" className="text-xs text-muted-foreground">
                Same time each day
              </Label>
              <Switch
                id="edit-uniform-time"
                checked={useUniformTime}
                onCheckedChange={setUseUniformTime}
              />
            </div>
          )}
        </div>

        {useUniformTime || !isMultiDay ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Start Time</Label>
              <TimePicker
                value={uniformStartTime}
                onChange={setUniformStartTime}
                placeholder="Start time"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End Time</Label>
              <TimePicker
                value={uniformEndTime}
                onChange={setUniformEndTime}
                placeholder="End time"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
            {daySchedules.map((day) => (
              <div key={day.date.toISOString()} className="py-2 border-b last:border-0">
                <div className="text-sm font-medium mb-2">
                  {format(day.date, 'EEE, MMM d')}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <TimePickerInline
                    value={day.startTime}
                    onChange={(v) => updateDaySchedule(day.date, 'startTime', v)}
                  />
                  <span className="text-muted-foreground px-1">–</span>
                  <TimePickerInline
                    value={day.endTime}
                    onChange={(v) => updateDaySchedule(day.date, 'endTime', v)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recurrence */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="edit-recurring">Recurring Event</Label>
          </div>
          <Switch
            id="edit-recurring"
            checked={isRecurring}
            onCheckedChange={setIsRecurring}
          />
        </div>

        {isRecurring && (
          <div className="space-y-3 pl-6">
            <div>
              <Label className="text-xs text-muted-foreground">Repeat Pattern</Label>
              <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recurrenceType === 'weekly' && (
              <div>
                <Label className="text-xs text-muted-foreground">Repeat on</Label>
                <div className="flex gap-1 mt-1">
                  {WEEKDAYS.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      size="sm"
                      variant={selectedWeekdays.includes(day.value) ? 'default' : 'outline'}
                      className="w-10 h-10 p-0"
                      onClick={() => toggleWeekday(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {recurrenceType === 'monthly' && (
              <div>
                <Label className="text-xs text-muted-foreground">Week of Month</Label>
                <Select value={weekOfMonth} onValueChange={(v) => setWeekOfMonth(v as WeekOfMonth)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">First weekend</SelectItem>
                    <SelectItem value="second">Second weekend</SelectItem>
                    <SelectItem value="third">Third weekend</SelectItem>
                    <SelectItem value="fourth">Fourth weekend</SelectItem>
                    <SelectItem value="last">Last weekend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="edit-notes">Notes</Label>
        <Textarea
          id="edit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional details or reminders..."
          rows={2}
        />
      </div>

      {/* Costs (Collapsible) */}
      <Collapsible open={showCosts} onOpenChange={setShowCosts}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="w-full justify-between">
            <span>Event Costs</span>
            {showCosts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="edit-stall_fee" className="text-xs">Stall Fee</Label>
              <Input
                id="edit-stall_fee"
                type="number"
                step="0.01"
                min="0"
                value={stallFee}
                onChange={(e) => setStallFee(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-travel_cost" className="text-xs">Travel</Label>
              <Input
                id="edit-travel_cost"
                type="number"
                step="0.01"
                min="0"
                value={travelCost}
                onChange={(e) => setTravelCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-other_costs" className="text-xs">Other</Label>
              <Input
                id="edit-other_costs"
                type="number"
                step="0.01"
                min="0"
                value={otherCosts}
                onChange={(e) => setOtherCosts(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-cost_notes" className="text-xs">Cost Notes</Label>
            <Input
              id="edit-cost_notes"
              value={costNotes}
              onChange={(e) => setCostNotes(e.target.value)}
              placeholder="Additional cost details..."
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateEvent.isPending}>
          {updateEvent.isPending ? 'Updating...' : 'Update Event'}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Edit Market Event</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {FormContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Market Event</DialogTitle>
        </DialogHeader>
        {FormContent}
      </DialogContent>
    </Dialog>
  );
}
