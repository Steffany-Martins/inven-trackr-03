import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { exportToExcel } from "@/utils/exportExcel";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StockMovements() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 0,
    movement_type: "adjustment",
    reason: "",
  });

  const canCreate = profile?.role === "manager" || profile?.role === "supervisor";

  const { data: movements, isLoading } = useQuery({
    queryKey: ["stock_movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const productIds = [...new Set(data?.map(m => m.product_id))];
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, category")
        .in("id", productIds);

      const userIds = [...new Set(data?.filter(m => m.user_id).map(m => m.user_id))];
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      return data?.map(m => ({
        ...m,
        products: productsData?.find(p => p.id === m.product_id),
        profiles: usersData?.find(u => u.id === m.user_id)
      }));
    },
  });

  const filteredMovements = categoryFilter === "all"
    ? movements
    : movements?.filter(m => m.products?.category?.toLowerCase() === categoryFilter);

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMovementMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: product } = await supabase
        .from("products")
        .select("current_stock, quantity")
        .eq("id", data.product_id)
        .single();

      if (!product) throw new Error("Produto não encontrado");

      const quantityBefore = product.current_stock || product.quantity || 0;
      const quantityChange = data.quantity;
      const quantityAfter = quantityBefore + quantityChange;

      const { error } = await supabase.from("stock_movements").insert([{
        product_id: data.product_id,
        movement_type: data.movement_type,
        quantity_before: quantityBefore,
        quantity_change: quantityChange,
        quantity_after: quantityAfter,
        reason: data.reason || "Ajuste manual"
      }]);

      if (error) throw error;

      await supabase
        .from("products")
        .update({
          current_stock: quantityAfter,
          quantity: quantityAfter
        })
        .eq("id", data.product_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Movimento registrado com sucesso" });
      setIsFormOpen(false);
      setFormData({ product_id: "", quantity: 0, movement_type: "adjustment", reason: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar movimento",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleExport = () => {
    if (!filteredMovements) return;
    const exportData = filteredMovements.map((m) => ({
      Data: format(new Date(m.created_at), "dd/MM/yyyy HH:mm"),
      Produto: m.products?.name,
      Categoria: m.products?.category,
      Tipo: m.movement_type,
      Quantidade: m.quantity_change,
      Usuário: m.profiles?.full_name || m.profiles?.email || "Sistema",
      Observações: m.reason || "",
    }));
    exportToExcel(exportData, "movimentacoes-estoque", "Movimentações de Estoque");
    toast({ title: "Exportação realizada com sucesso" });
  };

  const getMovementBadge = (type: string) => {
    const colors: Record<string, string> = {
      sale: "destructive",
      purchase: "default",
      adjustment: "secondary",
      return: "outline",
      waste: "destructive",
    };
    return <Badge variant={colors[type] as any}>{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimentações de Estoque</h1>
          <p className="text-muted-foreground">Histórico de entradas e saídas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          {canCreate && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Movimento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Movimento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Produto</Label>
                    <Select
                      value={formData.product_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, product_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de Movimento</Label>
                    <Select
                      value={formData.movement_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, movement_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale">Venda</SelectItem>
                        <SelectItem value="purchase">Compra</SelectItem>
                        <SelectItem value="adjustment">Ajuste</SelectItem>
                        <SelectItem value="return">Devolução</SelectItem>
                        <SelectItem value="waste">Perda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantidade (use negativo para saídas)</Label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    onClick={() => createMovementMutation.mutate(formData)}
                    className="w-full"
                  >
                    Registrar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
        <TabsList className="w-full justify-start bg-warning/20 border-b rounded-none h-auto p-0">
          <TabsTrigger
            value="all"
            className="rounded-none data-[state=active]:bg-warning data-[state=active]:text-warning-foreground px-8 py-3"
          >
            Todas Categorias
          </TabsTrigger>
          <TabsTrigger
            value="padaria"
            className="rounded-none data-[state=active]:bg-warning data-[state=active]:text-warning-foreground px-8 py-3"
          >
            Padaria
          </TabsTrigger>
          <TabsTrigger
            value="restaurante"
            className="rounded-none data-[state=active]:bg-warning data-[state=active]:text-warning-foreground px-8 py-3"
          >
            Restaurante
          </TabsTrigger>
          <TabsTrigger
            value="bar"
            className="rounded-none data-[state=active]:bg-warning data-[state=active]:text-warning-foreground px-8 py-3"
          >
            Bar
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Em Estoque</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements?.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>{movement.products?.name}</TableCell>
                    <TableCell className="capitalize">{movement.products?.category || "N/A"}</TableCell>
                    <TableCell>{getMovementBadge(movement.movement_type)}</TableCell>
                    <TableCell
                      className={movement.quantity_change > 0 ? "text-green-600" : "text-red-600"}
                    >
                      {movement.quantity_change > 0 ? "+" : ""}
                      {movement.quantity_change}
                    </TableCell>
                    <TableCell>
                      {movement.profiles?.full_name || movement.profiles?.email || "Sistema"}
                    </TableCell>
                    <TableCell>{movement.reason || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
