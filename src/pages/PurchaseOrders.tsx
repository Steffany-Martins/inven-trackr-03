import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { PurchaseOrderForm } from "@/components/PurchaseOrderForm";
import { PurchaseOrdersTable } from "@/components/PurchaseOrdersTable";
import { PurchaseOrderFilters } from "@/components/PurchaseOrderFilters";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function PurchaseOrders() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();
  const { userRole } = useAuth();
  const queryClient = useQueryClient();

  const canEdit = userRole === "manager" || userRole === "supervisor";

  const { data: orders, isLoading } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          products (name),
          suppliers (name, id)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    return orders.filter((order) => {
      const matchesSearch = !searchTerm || 
        order.products?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || 
        order.delivery_status === statusFilter;
      
      const matchesSupplier = supplierFilter === "all" || 
        order.supplier_id === supplierFilter;
      
      const matchesDateRange = (!startDate || new Date(order.created_at) >= new Date(startDate)) &&
        (!endDate || new Date(order.created_at) <= new Date(endDate));

      return matchesSearch && matchesStatus && matchesSupplier && matchesDateRange;
    });
  }, [orders, searchTerm, statusFilter, supplierFilter, startDate, endDate]);

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
        {canEdit && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Order
          </Button>
        )}
      </div>

      <PurchaseOrderFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        supplierFilter={supplierFilter}
        setSupplierFilter={setSupplierFilter}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        suppliers={suppliers || []}
      />

      <Card>
        <CardHeader>
          <CardTitle>All Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseOrdersTable
            orders={filteredOrders}
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
