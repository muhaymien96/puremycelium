import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export const useOrders = () => {
  const queryClient = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("inventory-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => queryClient.invalidateQueries()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => queryClient.invalidateQueries()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_batches" },
        () =>
          queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_movements" },
        () =>
          queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] })
      )
      .subscribe();

    return () => {
      // call removeChannel but do not return its Promise so the cleanup is synchronous (void)
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customers(first_name, last_name), order_items(*)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });
};

// Create new order
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderData: any) => {
      const { data, error } = await supabase.functions.invoke("orders", {
        method: "POST",
        body: orderData,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order created successfully");
    },
  });
};

// Process a payment
export const useProcessPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase.functions.invoke(
        "order-pay",
        {
          method: "POST",
          body: data,
        }
      );
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: () => toast.error("Payment failed"),
  });
};

// Send payment link
export const useSendPaymentLink = () =>
  useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.functions.invoke(
        "send-payment-link",
        {
          method: "POST",
          body: payload,
        }
      );
      if (error) throw error;
      return data;
    },
  });

// Refund payment
export const useProcessRefund = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.functions.invoke("order-refund", {
        method: "POST",
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};

// Update order status
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: payload.new_status })
        .eq("id", payload.order_id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Order status updated");
    },
  });
};

// Dashboard Stats
export const useDashboardStats = () =>
  useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [
        paymentsRes,
        customersRes,
        productsRes,
        refundsRes,
        ordersRes
      ] = await Promise.all([
        supabase.from("payments")
          .select("amount, payment_status")
          .eq("payment_status", "completed"),
        
        supabase.from("customers")
          .select("id", { count: "exact", head: true }),
        
        supabase.from("products")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        
        supabase.from("refunds")
          .select("amount")
          .eq("status", "completed"),

        supabase.from("orders")
          .select("id")
      ]);

      const totalSales = paymentsRes.data?.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      ) || 0;

      const totalRefunds = refundsRes.data?.reduce(
        (sum, refund) => sum + Number(refund.amount),
        0
      ) || 0;

      return {
        totalSales: totalSales - totalRefunds,
        orderCount: ordersRes.data?.length || 0,
        customerCount: customersRes.count || 0,
        productCount: productsRes.count || 0,
        totalRefunds,
      };
    },
  });
