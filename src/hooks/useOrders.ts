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
        .select("*, customers(first_name, last_name), order_items(*, products(name, sku)), external_source")
        .order("created_at", { ascending: false });

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

// Process a payment (CASH / YOKO_WEBPOS / PAYMENT_LINK)
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
      // Ensure all dependent dashboards and inventory snapshots refresh after a sale
      queryClient.invalidateQueries();
      queryClient.refetchQueries({ queryKey: ["inventory-dashboard"], type: "active" });
      queryClient.refetchQueries({ queryKey: ["dashboard-stats"], type: "active" });
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

// Dashboard Stats (unified revenue + refunds + inventory snapshot)
export const useDashboardStats = () =>
  useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [
        financialRes,
        customersRes,
        productsCountRes,
        ordersRes,
        refundsRes,
        inventoryRes,
      ] = await Promise.all([
        supabase
          .from("financial_transactions")
          .select("amount, cost, profit, transaction_type"),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase.from("orders").select("id"),
        supabase
          .from("refunds")
          .select("amount, created_at")
          .eq("status", "completed"),
        supabase
          .from("products")
          .select(
            "id, unit_price, is_active, product_batches(quantity, expiry_date)"
          )
          .eq("is_active", true),
      ]);

      if (financialRes.error) throw financialRes.error;
      if (customersRes.error) throw customersRes.error;
      if (productsCountRes.error) throw productsCountRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (refundsRes.error) throw refundsRes.error;
      if (inventoryRes.error) throw inventoryRes.error;

      const finTx = financialRes.data || [];

      const saleTx = finTx.filter(
        (tx: any) => tx.transaction_type === "sale"
      );
      const refundTx = finTx.filter(
        (tx: any) => tx.transaction_type === "refund"
      );

      // Gross sales from transactions of type "sale" only
      const grossSales =
        saleTx.reduce(
          (sum: number, tx: any) => sum + Number(tx.amount || 0),
          0
        ) || 0;

      // Refunds from financial_transactions (amounts stored as negative)
      const refundsFromFin =
        refundTx.reduce(
          (sum: number, tx: any) =>
            sum + Math.abs(Number(tx.amount || 0)),
          0
        ) || 0;

      // Fallback refunds from refunds table if no financial refund tx yet
      const refundsFromTable =
        refundsRes.data?.reduce(
          (sum: number, refund: any) => sum + Number(refund.amount || 0),
          0
        ) || 0;

      const totalRefunds = refundsFromFin || refundsFromTable;
      const netRevenue = grossSales - totalRefunds;

      // Net profit from ALL financial tx (sales + refunds)
      const netProfit =
        finTx.reduce(
          (sum: number, tx: any) => sum + Number(tx.profit || 0),
          0
        ) || 0;

      const profitMargin =
        netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

      // Inventory snapshot (at cost + simple stock alerts)
      // Need to fetch products with cost_price for proper fallback
      const { data: productsWithCost } = await supabase
        .from("products")
        .select("id, unit_price, cost_price, is_active, product_batches(quantity, expiry_date)")
        .eq("is_active", true);

      const inventoryProducts = productsWithCost || [];
      const LOW_STOCK_THRESHOLD = 10;
      const DAYS_TO_EXPIRY_WARNING = 30;
      const expiryCutoff = new Date();
      expiryCutoff.setDate(expiryCutoff.getDate() + DAYS_TO_EXPIRY_WARNING);

      let totalCostValue = 0;
      let totalRetailValue = 0;
      let lowStockCount = 0;
      let expiringBatchesCount = 0;

      (inventoryProducts as any[]).forEach((p) => {
        const batches = p.product_batches || [];
        let productStock = 0;

        batches.forEach((b: any) => {
          const qty = Number(b.quantity) || 0;
          productStock += qty;

          // Cost fallback chain: product.cost_price → unit_price * 0.6
          let costPerUnit: number;
          if (p.cost_price != null && !isNaN(Number(p.cost_price)) && Number(p.cost_price) > 0) {
            costPerUnit = Number(p.cost_price);
          } else {
            costPerUnit = Number(p.unit_price) * 0.6;
          }

          totalCostValue += qty * costPerUnit;
          totalRetailValue += qty * Number(p.unit_price);

          if (
            b.expiry_date &&
            new Date(b.expiry_date) < expiryCutoff &&
            qty > 0
          ) {
            expiringBatchesCount += 1;
          }
        });

        if (productStock < LOW_STOCK_THRESHOLD) {
          lowStockCount += 1;
        }
      });

      return {
        totalSales: grossSales,
        netRevenue,
        totalRefunds,
        totalProfit: netProfit,
        profitMargin,
        orderCount: ordersRes.data?.length || 0,
        customerCount: customersRes.count || 0,
        productCount: productsCountRes.count || 0,
        stockCostValue: totalCostValue,
        stockRetailValue: totalRetailValue,
        lowStockCount,
        expiringBatchesCount,
      };
    },
  });
