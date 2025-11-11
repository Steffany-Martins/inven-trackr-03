import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download } from "lucide-react";
import { useState } from "react";
import { ProductForm } from "@/components/ProductForm";
import { ProductsTable } from "@/components/ProductsTable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { exportToExcel } from "@/utils/exportExcel";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Products() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  const canAdd = permissions.canAddProducts;
  const canEdit = permissions.canEditProducts;
  const canDelete = permissions.canDeleteProducts;
  const canExport = permissions.canExportData;

  console.log('Products Page - Profile:', profile);
  console.log('Products Page - Permissions:', {
    canAdd,
    canEdit,
    canDelete,
    canExport
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredProducts = categoryFilter === "all" 
    ? products 
    : products?.filter(p => p.category?.toLowerCase() === categoryFilter);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: t("products.title") + " deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    },
  });

  const handleEdit = (product: any) => {
    if (!canEdit) {
      toast({ title: "Acesso negado", description: "Você não tem permissão para editar produtos", variant: "destructive" });
      return;
    }
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canDelete) {
      toast({ title: "Acesso negado", description: "Você não tem permissão para excluir produtos", variant: "destructive" });
      return;
    }
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleExport = () => {
    if (!canExport) {
      toast({ title: "Acesso negado", description: "Você não tem permissão para exportar dados", variant: "destructive" });
      return;
    }
    if (!filteredProducts) return;
    const exportData = filteredProducts.map(p => ({
      Nome: p.name,
      Categoria: p.category,
      Fornecedor: p.vendor_name,
      'Preço Unitário': p.unit_price,
      'Quantidade em Estoque': p.quantity_in_stock,
      'Limite Mínimo': p.threshold,
      'Data de Validade': p.expiration_date || 'N/A',
    }));
    exportToExcel(exportData, 'produtos', 'Produtos');
    toast({ title: "Produtos exportados com sucesso" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("products.title")}</h1>
          <p className="text-muted-foreground">{t("products.description")}</p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t("common.export")}
            </Button>
          )}
          {canAdd && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("products.addProduct")}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("products.title")}</CardTitle>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("common.filter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="padaria">{t("products.categories.bakery")}</SelectItem>
                <SelectItem value="restaurante">{t("products.categories.restaurant")}</SelectItem>
                <SelectItem value="bar">{t("products.categories.bar")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ProductsTable
            products={filteredProducts || []}
            isLoading={isLoading}
            onEdit={canEdit ? handleEdit : undefined}
            onDelete={canDelete ? handleDelete : undefined}
          />
        </CardContent>
      </Card>

      {isFormOpen && (
        <ProductForm
          product={editingProduct}
          onClose={handleFormClose}
          onSuccess={() => {
            handleFormClose();
            queryClient.invalidateQueries({ queryKey: ["products"] });
          }}
        />
      )}
    </div>
  );
}
