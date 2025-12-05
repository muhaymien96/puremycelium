import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateExpense, ExpenseType } from '@/hooks/useExpenses';
import { useMarketEvents } from '@/hooks/useMarketEvents';
import { Receipt, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const EXPENSE_TYPES: { value: ExpenseType; label: string }[] = [
  { value: 'event', label: 'Event' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operational', label: 'Operational' },
  { value: 'other', label: 'Other' },
];

export const QuickExpenseForm = () => {
  const [expenseType, setExpenseType] = useState<ExpenseType>('operational');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  const createExpense = useCreateExpense();
  const { data: events } = useMarketEvents();

  // Clear event selection when switching away from 'event' type
  useEffect(() => {
    if (expenseType !== 'event') {
      setSelectedEventId(null);
    }
  }, [expenseType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description) return;
    if (expenseType === 'event' && !selectedEventId) return;

    createExpense.mutate(
      {
        expense_type: expenseType,
        amount: parseFloat(amount),
        expense_date: new Date().toISOString().split('T')[0],
        description,
        market_event_id: expenseType === 'event' ? selectedEventId : null,
      },
      {
        onSuccess: () => {
          setAmount('');
          setDescription('');
          setSelectedEventId(null);
        },
      }
    );
  };

  const isSubmitDisabled = 
    createExpense.isPending || 
    !amount || 
    !description || 
    (expenseType === 'event' && !selectedEventId);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm md:text-base flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          Quick Expense
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expense-type" className="text-xs">Type</Label>
              <Select value={expenseType} onValueChange={(v) => setExpenseType(v as ExpenseType)}>
                <SelectTrigger id="expense-type" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-xs">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount" className="text-xs">Amount (R)</Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Conditional Event Selector - only shown when type is 'event' */}
          {expenseType === 'event' && (
            <div className="space-y-1.5">
              <Label htmlFor="expense-event" className="text-xs">
                Market Event <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={selectedEventId || ''} 
                onValueChange={setSelectedEventId}
              >
                <SelectTrigger id="expense-event" className="h-9 text-xs">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events?.map((event) => (
                    <SelectItem key={event.id} value={event.id} className="text-xs">
                      {event.name} - {format(new Date(event.event_date), 'MMM d')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="expense-description" className="text-xs">Description</Label>
            <Input
              id="expense-description"
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>
          <Button 
            type="submit" 
            size="sm" 
            className="w-full gap-1.5"
            disabled={isSubmitDisabled}
          >
            {createExpense.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add Expense
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
