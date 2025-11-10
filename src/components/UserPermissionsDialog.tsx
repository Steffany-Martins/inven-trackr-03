import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "sonner";

interface UserPermissionsDialogProps {
  userId: string;
  userName: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: "can_add_products", label: "Adicionar Produtos" },
  { id: "can_edit_products", label: "Editar Produtos" },
  { id: "can_delete_products", label: "Excluir Produtos" },
  { id: "can_add_invoices", label: "Adicionar Faturas" },
  { id: "can_edit_invoices", label: "Editar Faturas" },
  { id: "can_delete_invoices", label: "Excluir Faturas" },
  { id: "can_add_purchase_orders", label: "Adicionar Pedidos de Compra" },
  { id: "can_edit_purchase_orders", label: "Editar Pedidos de Compra" },
  { id: "can_delete_purchase_orders", label: "Excluir Pedidos de Compra" },
  { id: "can_add_suppliers", label: "Adicionar Fornecedores" },
  { id: "can_edit_suppliers", label: "Editar Fornecedores" },
  { id: "can_delete_suppliers", label: "Excluir Fornecedores" },
  { id: "can_view_insights", label: "Ver Insights AI" },
  { id: "can_export_data", label: "Exportar Dados" },
];

export function UserPermissionsDialog({ userId, userName }: UserPermissionsDialogProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: userPermissions, isLoading } = useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const grantPermissionMutation = useMutation({
    mutationFn: async (permission: string) => {
      const { error } = await supabase.from("user_permissions").insert({
        user_id: userId,
        permission_name: permission,
        granted_by: profile?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions", userId] });
      toast.success("Permissão concedida com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao conceder permissão: " + error.message);
    },
  });

  const revokePermissionMutation = useMutation({
    mutationFn: async (permission: string) => {
      const { error } = await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", userId)
        .eq("permission_name", permission);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions", userId] });
      toast.success("Permissão revogada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao revogar permissão: " + error.message);
    },
  });

  const hasPermission = (permissionId: string) => {
    return userPermissions?.some((p) => p.permission_name === permissionId);
  };

  const handlePermissionToggle = (permissionId: string) => {
    if (hasPermission(permissionId)) {
      revokePermissionMutation.mutate(permissionId);
    } else {
      grantPermissionMutation.mutate(permissionId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="mr-2 h-4 w-4" />
          Permissões
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Permissões - {userName}</DialogTitle>
          <DialogDescription>
            Defina permissões específicas para este usuário. Estas permissões complementam as permissões do cargo.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              {AVAILABLE_PERMISSIONS.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={permission.id}
                    checked={hasPermission(permission.id)}
                    onCheckedChange={() => handlePermissionToggle(permission.id)}
                  />
                  <Label
                    htmlFor={permission.id}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {permission.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
