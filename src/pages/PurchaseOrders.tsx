import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PurchaseOrderForm } from "@/components/PurchaseOrderForm";
import { PurchaseOrdersTable } from "@/components/PurchaseOrdersTable";
import { useToast } from "@/hooks/use-toast";

export default function PurchaseOrders() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          products (name),
          suppliers (name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "in_transit" | "delivered" | "cancelled" }) => {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ delivery_status: status })
        .eq("id", id);
      if (error) throw error;

      // If delivered, update product stock
      if (status === "delivered") {
        const order = orders?.find((o) => o.id === id);
        if (order) {
          const { data: product } = await supabase
            .from("products")
            .select("quantity_in_stock")
            .eq("id", order.product_id)
            .single();

          if (product) {
            await supabase
              .from("products")
              .update({
                quantity_in_stock: product.quantity_in_stock + order.quantity,
              })
              .eq("id", order.product_id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Order status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update order status", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">Track inventory orders</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseOrdersTable
            orders={orders || []}
            isLoading={isLoading}
            onUpdateStatus={(id, status) =>
              updateStatusMutation.mutate({ id, status })
            }
          />
        </CardContent>
      </Card>

      {isFormOpen && (
        <PurchaseOrderForm
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
          }}
        />
      )}
    </div>
  );
}
