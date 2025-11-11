import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileUp } from "lucide-react";
import { useState } from "react";
import { InvoiceForm } from "@/components/InvoiceForm";
import { InvoicesTable } from "@/components/InvoicesTable";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";

export default function Invoices() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { profile } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  const canAdd = permissions.canAddInvoices;
  const canEdit = permissions.canEditInvoices;
  const canDelete = permissions.canDeleteInvoices;

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          created_by_profile:profiles!invoices_created_by_fkey(full_name, email),
          updated_by_profile:profiles!invoices_updated_by_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faturas</h1>
          <p className="text-muted-foreground">Gerencie as faturas de compra e vendas</p>
        </div>
        {canAdd && (
          <div className="flex gap-2">
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Fatura
            </Button>
            <Button variant="outline">
              <FileUp className="mr-2 h-4 w-4" />
              Importar CSV/PDF
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoicesTable invoices={invoices || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      {isFormOpen && (
        <InvoiceForm
          onClose={() => {
            setIsFormOpen(false);
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
          }}
        />
      )}
    </div>
  );
}
