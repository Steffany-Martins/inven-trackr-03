import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download, Search } from "lucide-react";
import { useState } from "react";
import { SupplierForm } from "@/components/SupplierForm";
import { SuppliersTable } from "@/components/SuppliersTable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Input } from "@/components/ui/input";
import { exportToExcel } from "@/utils/exportExcel";

export default function Suppliers() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  const canAdd = permissions.canAddSuppliers;
  const canEdit = permissions.canEditSuppliers;
  const canDelete = permissions.canDeleteSuppliers;

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Supplier deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete supplier", variant: "destructive" });
    },
  });

  const handleEdit = (supplier: any) => {
    if (!canEdit) {
      toast({ title: "Access denied", description: "You don't have permission to edit suppliers", variant: "destructive" });
      return;
    }
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canDelete) {
      toast({ title: "Access denied", description: "Only managers can delete suppliers", variant: "destructive" });
      return;
    }
    if (confirm("Are you sure you want to delete this supplier?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingSupplier(null);
  };

  const filteredSuppliers = suppliers?.filter(supplier => {
    const search = searchTerm.toLowerCase();
    return (
      supplier.name?.toLowerCase().includes(search) ||
      supplier.cnpj?.toLowerCase().includes(search) ||
      supplier.phone?.toLowerCase().includes(search) ||
      supplier.email?.toLowerCase().includes(search)
    );
  });

  const handleExport = () => {
    if (!filteredSuppliers) return;
    const exportData = filteredSuppliers.map(s => ({
      CNPJ: s.cnpj || "",
      Nome: s.name,
      Telefone: s.phone,
      Email: s.email || "",
      Contato: s.contact || "",
      "Prazo de Entrega (dias)": s.delivery_time_days || "",
    }));
    exportToExcel(exportData, "fornecedores", "Fornecedores");
    toast({ title: "Exportação realizada com sucesso" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          {canAdd && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Fornecedor
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Fornecedores</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ, telefone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <SuppliersTable
            suppliers={filteredSuppliers || []}
            isLoading={isLoading}
            onEdit={canEdit ? handleEdit : undefined}
            onDelete={canDelete ? handleDelete : undefined}
          />
        </CardContent>
      </Card>

      {isFormOpen && (
        <SupplierForm
          supplier={editingSupplier}
          onClose={handleFormClose}
          onSuccess={() => {
            handleFormClose();
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
          }}
        />
      )}
    </div>
  );
}
