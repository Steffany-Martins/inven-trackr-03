import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertTriangle, Calendar, DollarSign, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function Insights() {
  const [insights, setInsights] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [cmvData, setCmvData] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const currentMonth = new Date();
  const lastMonth = subMonths(currentMonth, 1);

  const { data: products } = useQuery({
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

  const { data: purchaseOrders } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, products(name), suppliers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: lowStockAlerts } = useQuery({
    queryKey: ["low_stock_alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("low_stock_alerts")
        .select("*, products(name, unit_price)")
        .eq("status", "active")
        .order("severity", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: fraudAlerts } = useQuery({
    queryKey: ["fraud_alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fraud_alerts")
        .select("*")
        .eq("status", "pending")
        .order("severity", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    calculateCMV();
  }, [products, purchaseOrders]);

  const calculateCMV = async () => {
    try {
      const startDate = format(startOfMonth(lastMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(lastMonth), "yyyy-MM-dd");

      const { data, error } = await supabase.rpc("calculate_cmv", {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setCmvData(data[0]);
      }
    } catch (error) {
      console.error("Error calculating CMV:", error);
    }
  };

  const expensiveProducts = products
    ?.sort((a, b) => Number(b.unit_price) - Number(a.unit_price))
    .slice(0, 5);

  const stagnantProducts = products?.filter((p) => {
    return p.current_stock > p.minimum_stock * 3;
  });

  const generateInsights = async () => {
    setIsGenerating(true);
    
    try {
      const inventoryData = {
        products,
        purchaseOrders,
        invoices,
        summary: {
          totalProducts: products?.length || 0,
          lowStockProducts: products?.filter(p => p.current_stock < p.minimum_stock).length || 0,
          totalPurchaseOrders: purchaseOrders?.length || 0,
          pendingOrders: purchaseOrders?.filter(o => o.status === 'pending').length || 0,
          totalInvoices: invoices?.length || 0,
        }
      };

      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: { inventoryData },
      });

      if (error) throw error;

      setInsights(data.insights);
      toast({
        title: t("insights.title") + " gerados com sucesso",
        description: t("insights.aiAnalysis"),
      });
    } catch (error: any) {
      console.error("Error generating insights:", error);
      toast({
        title: "Failed to generate insights",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("insights.title")}</h1>
          <p className="text-muted-foreground">{t("insights.description")}</p>
        </div>
        <Button onClick={generateInsights} disabled={isGenerating}>
          <Sparkles className="mr-2 h-4 w-4" />
          {isGenerating ? t("insights.generating") : t("insights.generateInsights")}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-foreground/80">CMV do Mês</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              R$ {cmvData?.cmv?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(lastMonth, "MMMM yyyy")}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-transparent to-warning/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-foreground/80">Estoque Baixo</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-warning/20 to-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">{lowStockAlerts?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Alertas ativos</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-destructive/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-foreground/80">Alertas de Segurança</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">{fraudAlerts?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Não resolvidos</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-foreground/80">Produtos Parados</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">{stagnantProducts?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Estoque alto</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Caros</CardTitle>
            <CardDescription>Top 5 produtos por preço unitário</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expensiveProducts?.map((product) => (
                <div key={product.id} className="flex justify-between items-center">
                  <span className="font-medium">{product.name}</span>
                  <Badge variant="secondary">R$ {Number(product.unit_price).toFixed(2)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sugestões de Reposição</CardTitle>
            <CardDescription>Produtos com estoque crítico</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockAlerts?.slice(0, 5).map((alert: any) => (
                <div key={alert.id} className="flex justify-between items-center">
                  <span className="font-medium">{alert.products?.name}</span>
                  <Badge variant="destructive">{alert.current_stock} un.</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {cmvData && (
        <Card>
          <CardHeader>
            <CardTitle>Análise CMV - {format(lastMonth, "MMMM yyyy")}</CardTitle>
            <CardDescription>Custo da Mercadoria Vendida</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estoque Inicial</p>
                <p className="text-2xl font-bold">R$ {Number(cmvData.total_inicial).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compras</p>
                <p className="text-2xl font-bold">R$ {Number(cmvData.total_compras).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estoque Final</p>
                <p className="text-2xl font-bold">R$ {Number(cmvData.total_final).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">CMV Total</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {Number(cmvData.cmv).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Generated Insights
            </CardTitle>
            <CardDescription>
              Based on your current inventory data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {insights}
            </div>
          </CardContent>
        </Card>
      )}

      {!insights && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              Click "Generate Insights" to get AI-powered analysis of your inventory
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
