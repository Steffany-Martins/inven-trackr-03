import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PurchaseOrderForm } from "@/components/PurchaseOrderForm";
import { PurchaseOrdersTable } from "@/components/PurchaseOrdersTable";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

export default function PurchaseOrders() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  const canAdd = permissions.canAddPurchaseOrders;
  const canEdit = permissions.canEditPurchaseOrders;
  const canDelete = permissions.canDeletePurchaseOrders;

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          purchase_order_items (*)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_orders")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir pedido: " + error.message);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos de Compra</h1>
          <p className="text-muted-foreground">Gerencie pedidos aos fornecedores</p>
        </div>
        {canAdd && (
          <Button onClick={() => { setSelectedOrder(null); setIsFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseOrdersTable
            purchaseOrders={purchaseOrders || []}
            isLoading={isLoading}
            onEdit={canEdit ? (order) => { setSelectedOrder(order); setIsFormOpen(true); } : undefined}
            onDelete={canEdit ? (id) => deleteMutation.mutate(id) : undefined}
          />
        </CardContent>
      </Card>

      {isFormOpen && (
        <PurchaseOrderForm
          order={selectedOrder}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedOrder(null);
            queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
          }}
        />
      )}
    </div>
  );
}
