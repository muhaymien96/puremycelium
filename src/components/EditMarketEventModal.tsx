import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateMarketEvent, MarketEvent } from '@/hooks/useMarketEvents';

interface EditMarketEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: MarketEvent | null;
}

export function EditMarketEventModal({ open, onOpenChange, event }: EditMarketEventModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');

  const updateEvent = useUpdateMarketEvent();

  useEffect(() => {
    if (event) {
      setName(event.name);
      setLocation(event.location);
      setEventDate(event.event_date);
      setStartTime(event.start_time || '');
      setEndTime(event.end_time || '');
      setNotes(event.notes || '');
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event || !name || !location || !eventDate) {
      return;
    }

    await updateEvent.mutateAsync({
      id: event.id,
      updates: {
        name,
        location,
        event_date: eventDate,
        start_time: startTime || null,
        end_time: endTime || null,
        notes: notes || null,
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Market Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Saturday Farmers Market"
              required
            />
          </div>

          <div>
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., City Center Square"
              required
            />
          </div>

          <div>
            <Label htmlFor="event_date">Date *</Label>
            <Input
              id="event_date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details or reminders..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateEvent.isPending}>
              {updateEvent.isPending ? 'Updating...' : 'Update Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
