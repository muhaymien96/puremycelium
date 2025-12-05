import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { Tables } from '@/integrations/supabase/types';

export type MarketEvent = Tables<"market_events">;

export function useMarketEvents() {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('market-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_events'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['market-events'] });
          queryClient.invalidateQueries({ queryKey: ['upcoming-market-events'] });
          queryClient.invalidateQueries({ queryKey: ['monthly-event-profitability'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['market-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_events')
        .select('*')
        .order('event_date', { ascending: false });
      
      if (error) throw error;
      return data as MarketEvent[];
    }
  });
}

export function useMarketEvent(id: string) {
  return useQuery({
    queryKey: ['market-event', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_events')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as MarketEvent;
    },
    enabled: !!id
  });
}

export function useUpcomingMarketEvents(limit: number = 5) {
  return useQuery({
    queryKey: ['upcoming-market-events', limit],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('market_events')
        .select('*')
        .gte('event_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return data as MarketEvent[];
    }
  });
}

export function useCreateMarketEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (event: Omit<MarketEvent, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('market_events')
        .insert([{ ...event, created_by: user?.id }])
        .select()
        .single();
      
      if (error) throw error;

      // Auto-create expenses for event costs (using 'event' type for all market event-related costs)
      type ExpenseType = 'event' | 'supplies' | 'marketing' | 'operational' | 'other';
      const expensesToCreate: Array<{
        expense_type: ExpenseType;
        amount: number;
        expense_date: string;
        description: string;
        market_event_id: string;
        created_by: string | undefined;
      }> = [];

      if (event.stall_fee && event.stall_fee > 0) {
        expensesToCreate.push({
          expense_type: 'event' as ExpenseType,
          amount: event.stall_fee,
          expense_date: event.event_date,
          description: `Stall fee for ${event.name}`,
          market_event_id: data.id,
          created_by: user?.id,
        });
      }

      if (event.travel_cost && event.travel_cost > 0) {
        expensesToCreate.push({
          expense_type: 'operational' as ExpenseType,
          amount: event.travel_cost,
          expense_date: event.event_date,
          description: `Travel costs for ${event.name}`,
          market_event_id: data.id,
          created_by: user?.id,
        });
      }

      if (event.other_costs && event.other_costs > 0) {
        expensesToCreate.push({
          expense_type: 'other' as ExpenseType,
          amount: event.other_costs,
          expense_date: event.event_date,
          description: `Other costs for ${event.name}${event.cost_notes ? ': ' + event.cost_notes : ''}`,
          market_event_id: data.id,
          created_by: user?.id,
        });
      }

      if (expensesToCreate.length > 0) {
        const { error: expenseError } = await supabase
          .from('expenses')
          .insert(expensesToCreate);

        if (expenseError) {
          console.error('Failed to create event expenses:', expenseError);
          // Don't throw - event was created successfully, expenses are secondary
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-events'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-market-events'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Event created successfully');
    },
    onError: () => {
      toast.error('Failed to create event');
    }
  });
}

export function useUpdateMarketEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MarketEvent> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('market_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // If costs are being updated, sync the linked expenses
      if (updates.stall_fee !== undefined || updates.travel_cost !== undefined || updates.other_costs !== undefined) {
        // Delete existing auto-created expenses for this event (using valid expense types)
        await supabase
          .from('expenses')
          .delete()
          .eq('market_event_id', id)
          .in('expense_type', ['event', 'operational', 'other']);

        // Re-create expenses with updated values
        type ExpenseType = 'event' | 'supplies' | 'marketing' | 'operational' | 'other';
        const expensesToCreate: Array<{
          expense_type: ExpenseType;
          amount: number;
          expense_date: string;
          description: string;
          market_event_id: string;
          created_by: string | undefined;
        }> = [];

        const stallFee = updates.stall_fee ?? data.stall_fee;
        const travelCost = updates.travel_cost ?? data.travel_cost;
        const otherCosts = updates.other_costs ?? data.other_costs;
        const eventName = updates.name ?? data.name;
        const eventDate = updates.event_date ?? data.event_date;
        const costNotes = updates.cost_notes ?? data.cost_notes;

        if (stallFee && stallFee > 0) {
          expensesToCreate.push({
            expense_type: 'event' as ExpenseType,
            amount: stallFee,
            expense_date: eventDate,
            description: `Stall fee for ${eventName}`,
            market_event_id: id,
            created_by: user?.id,
          });
        }

        if (travelCost && travelCost > 0) {
          expensesToCreate.push({
            expense_type: 'operational' as ExpenseType,
            amount: travelCost,
            expense_date: eventDate,
            description: `Travel costs for ${eventName}`,
            market_event_id: id,
            created_by: user?.id,
          });
        }

        if (otherCosts && otherCosts > 0) {
          expensesToCreate.push({
            expense_type: 'other' as ExpenseType,
            amount: otherCosts,
            expense_date: eventDate,
            description: `Other costs for ${eventName}${costNotes ? ': ' + costNotes : ''}`,
            market_event_id: id,
            created_by: user?.id,
          });
        }

        if (expensesToCreate.length > 0) {
          await supabase.from('expenses').insert(expensesToCreate);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-events'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-market-events'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Event updated successfully');
    },
    onError: () => {
      toast.error('Failed to update event');
    }
  });
}

export function useDeleteMarketEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('market_events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-events'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-market-events'] });
      toast.success('Event deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete event');
    }
  });
}
