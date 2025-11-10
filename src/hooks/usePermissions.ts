import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePermissions() {
  const { profile, user } = useAuth();

  const { data: userPermissions = [] } = useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_permissions")
        .select("permission_name")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching permissions:", error);
        return [];
      }

      return data.map(p => p.permission_name);
    },
    enabled: !!user?.id,
  });

  const hasPermission = (permission: string): boolean => {
    if (!profile) return false;

    if (profile.role === "manager") {
      return true;
    }

    if (profile.role === "supervisor") {
      const supervisorPermissions = [
        "can_add_products",
        "can_edit_products",
        "can_add_invoices",
        "can_edit_invoices",
        "can_add_purchase_orders",
        "can_edit_purchase_orders",
        "can_add_suppliers",
        "can_edit_suppliers",
        "can_view_insights",
        "can_export_data",
      ];
      if (supervisorPermissions.includes(permission)) {
        return true;
      }
    }

    return userPermissions.includes(permission);
  };

  const canAddProducts = hasPermission("can_add_products");
  const canEditProducts = hasPermission("can_edit_products");
  const canDeleteProducts = hasPermission("can_delete_products");

  const canAddInvoices = hasPermission("can_add_invoices");
  const canEditInvoices = hasPermission("can_edit_invoices");
  const canDeleteInvoices = hasPermission("can_delete_invoices");

  const canAddPurchaseOrders = hasPermission("can_add_purchase_orders");
  const canEditPurchaseOrders = hasPermission("can_edit_purchase_orders");
  const canDeletePurchaseOrders = hasPermission("can_delete_purchase_orders");

  const canAddSuppliers = hasPermission("can_add_suppliers");
  const canEditSuppliers = hasPermission("can_edit_suppliers");
  const canDeleteSuppliers = hasPermission("can_delete_suppliers");

  const canViewInsights = hasPermission("can_view_insights");
  const canExportData = hasPermission("can_export_data");

  return {
    hasPermission,
    canAddProducts,
    canEditProducts,
    canDeleteProducts,
    canAddInvoices,
    canEditInvoices,
    canDeleteInvoices,
    canAddPurchaseOrders,
    canEditPurchaseOrders,
    canDeletePurchaseOrders,
    canAddSuppliers,
    canEditSuppliers,
    canDeleteSuppliers,
    canViewInsights,
    canExportData,
  };
}
