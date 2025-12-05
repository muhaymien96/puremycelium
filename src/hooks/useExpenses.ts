import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert, Enums } from "@/integrations/supabase/types";

type Expense = Tables<"expenses"> & {
  market_events?: {
    id: string;
    name: string;
    event_date: string;
  } | null;
};

export type ExpenseType = Enums<"expense_type">;
export type CreateExpenseData = Omit<TablesInsert<"expenses">, "id" | "created_at" | "updated_at" | "created_by">;

export const useExpenses = (dateRange?: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: ['expenses', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          market_events (
            id,
            name,
            event_date
          )
        `)
        .order('expense_date', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('expense_date', dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange?.to) {
        query = query.lte('expense_date', dateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
  });
};

export const useExpensesByEvent = (eventId: string | null) => {
  return useQuery({
    queryKey: ['expenses', 'event', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('market_event_id', eventId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!eventId,
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseData) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          ...data,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense added successfully');
    },
    onError: (error: Error) => {
      console.error('Create expense error:', error);
      toast.error(`Failed to add expense: ${error.message}`);
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateExpenseData> & { id: string }) => {
      const { data: expense, error } = await supabase
        .from('expenses')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense updated successfully');
    },
    onError: (error: Error) => {
      console.error('Update expense error:', error);
      toast.error(`Failed to update expense: ${error.message}`);
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Delete expense error:', error);
      toast.error(`Failed to delete expense: ${error.message}`);
    },
  });
};

export const useExpenseSummary = (dateRange?: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: ['expenses', 'summary', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('expense_type, amount');

      if (dateRange?.from) {
        query = query.gte('expense_date', dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange?.to) {
        query = query.lte('expense_date', dateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by type
      const summary: Record<ExpenseType, number> = {
        event: 0,
        supplies: 0,
        marketing: 0,
        operational: 0,
        other: 0,
      };

      let total = 0;
      data?.forEach((expense: { expense_type: ExpenseType; amount: number }) => {
        summary[expense.expense_type] += Number(expense.amount);
        total += Number(expense.amount);
      });

      return { byType: summary, total };
    },
  });
};
