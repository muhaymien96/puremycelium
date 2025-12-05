import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateMarketEvent } from '@/hooks/useMarketEvents';

interface AddMarketEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
}

export function AddMarketEventModal({ open, onOpenChange, initialDate }: AddMarketEventModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState(initialDate || '');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [stallFee, setStallFee] = useState('');
  const [travelCost, setTravelCost] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [costNotes, setCostNotes] = useState('');

  const createEvent = useCreateMarketEvent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !location || !eventDate) {
      return;
    }

    await createEvent.mutateAsync({
      name,
      location,
      event_date: eventDate,
      start_time: startTime || null,
      end_time: endTime || null,
      notes: notes || null,
      stall_fee: stallFee ? Number(stallFee) : null,
      travel_cost: travelCost ? Number(travelCost) : null,
      other_costs: otherCosts ? Number(otherCosts) : null,
      cost_notes: costNotes || null,
    });

    // Reset form
    setName('');
    setLocation('');
    setEventDate('');
    setStartTime('');
    setEndTime('');
    setNotes('');
    setStallFee('');
    setTravelCost('');
    setOtherCosts('');
    setCostNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Market Event</DialogTitle>
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

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-sm">Event Costs</h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="stall_fee">Stall Fee</Label>
                <Input
                  id="stall_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={stallFee}
                  onChange={(e) => setStallFee(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="travel_cost">Travel</Label>
                <Input
                  id="travel_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={travelCost}
                  onChange={(e) => setTravelCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="other_costs">Other</Label>
                <Input
                  id="other_costs"
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
              <Label htmlFor="cost_notes">Cost Notes</Label>
              <Textarea
                id="cost_notes"
                value={costNotes}
                onChange={(e) => setCostNotes(e.target.value)}
                placeholder="Additional cost details..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
