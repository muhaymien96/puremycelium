import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Plus,
  Receipt,
  Calendar,
  Edit2,
  Trash2,
  MapPin,
  ShoppingBag,
  Megaphone,
  Settings,
  HelpCircle,
} from 'lucide-react';
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useExpenseSummary,
  type ExpenseType,
  type CreateExpenseData,
} from '@/hooks/useExpenses';
import { useMarketEvents } from '@/hooks/useMarketEvents';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { DateRange } from 'react-day-picker';

const expenseTypeIcons: Record<ExpenseType, any> = {
  event: MapPin,
  supplies: ShoppingBag,
  marketing: Megaphone,
  operational: Settings,
  other: HelpCircle,
};

const expenseTypeColors: Record<ExpenseType, string> = {
  event: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  supplies: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  marketing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  operational: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const defaultFormData: CreateExpenseData = {
  expense_type: 'operational',
  amount: 0,
  expense_date: new Date().toISOString().split('T')[0],
  description: '',
  notes: '',
  market_event_id: null,
};

export default function Expenses() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateExpenseData>(defaultFormData);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: expenses, isLoading } = useExpenses(
    dateRange?.from && dateRange?.to 
      ? { from: dateRange.from, to: dateRange.to } 
      : undefined
  );
  const { data: summary } = useExpenseSummary(
    dateRange?.from && dateRange?.to 
      ? { from: dateRange.from, to: dateRange.to } 
      : undefined
  );
  const { data: events } = useMarketEvents();
  const { data: isAdmin } = useIsAdmin();

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const filteredExpenses = expenses?.filter(e => 
    typeFilter === 'all' || e.expense_type === typeFilter
  );

  const handleSubmit = async () => {
    if (!formData.description || formData.amount <= 0) return;

    if (editingExpense) {
      await updateExpense.mutateAsync({ id: editingExpense, ...formData });
    } else {
      await createExpense.mutateAsync(formData);
    }

    setShowAddModal(false);
    setEditingExpense(null);
    setFormData(defaultFormData);
  };

  const handleEdit = (expense: any) => {
    setFormData({
      expense_type: expense.expense_type,
      amount: expense.amount,
      expense_date: expense.expense_date,
      description: expense.description,
      notes: expense.notes || '',
      market_event_id: expense.market_event_id,
    });
    setEditingExpense(expense.id);
    setShowAddModal(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteExpense.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingExpense(null);
    setFormData(defaultFormData);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Expenses</h1>
            <p className="text-muted-foreground text-sm">Track business and event costs</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            className="w-full sm:w-auto"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="supplies">Supplies</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">
                R {summary?.total?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">Total Expenses</p>
            </CardContent>
          </Card>
          {Object.entries(summary?.byType || {}).map(([type, amount]) => {
            const Icon = expenseTypeIcons[type as ExpenseType];
            return (
              <Card key={type}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="text-lg font-semibold">R {amount.toFixed(2)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{type}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Expenses List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredExpenses?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No expenses recorded</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowAddModal(true)}
              >
                Add your first expense
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredExpenses?.map((expense, index) => {
                const Icon = expenseTypeIcons[expense.expense_type];
                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg ${expenseTypeColors[expense.expense_type]}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{expense.description}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {format(new Date(expense.expense_date), 'MMM d, yyyy')}
                                </Badge>
                                {expense.market_events && (
                                  <Badge variant="secondary" className="text-xs">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {expense.market_events.name}
                                  </Badge>
                                )}
                              </div>
                              {expense.notes && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                                  {expense.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="font-bold text-red-600">
                                R {Number(expense.amount).toFixed(2)}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(expense)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => setDeleteConfirmId(expense.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Add/Edit Modal */}
        <Dialog open={showAddModal} onOpenChange={closeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={formData.expense_type}
                  onValueChange={(v: ExpenseType) => 
                    setFormData(f => ({ 
                      ...f, 
                      expense_type: v,
                      // Clear event when switching away from 'event' type
                      market_event_id: v === 'event' ? f.market_event_id : null 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="supplies">Supplies</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Amount (R)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => 
                    setFormData(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => 
                    setFormData(f => ({ ...f, expense_date: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => 
                    setFormData(f => ({ ...f, description: e.target.value }))
                  }
                  placeholder="What was this expense for?"
                />
              </div>

              {/* Conditional Event Selector - only shown when type is 'event' */}
              {formData.expense_type === 'event' && (
                <div>
                  <Label>
                    Market Event <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.market_event_id || ''}
                    onValueChange={(v) => 
                      setFormData(f => ({ ...f, market_event_id: v || null }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events?.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name} - {format(new Date(event.event_date), 'MMM d')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => 
                    setFormData(f => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={
                  !formData.description || 
                  formData.amount <= 0 || 
                  (formData.expense_type === 'event' && !formData.market_event_id) ||
                  createExpense.isPending || 
                  updateExpense.isPending
                }
              >
                {editingExpense ? 'Update' : 'Add'} Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The expense will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
