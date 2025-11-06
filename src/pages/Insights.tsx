import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Insights() {
  const [insights, setInsights] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

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

  const generateInsights = async () => {
    setIsGenerating(true);
    
    try {
      const inventoryData = {
        products,
        purchaseOrders,
        invoices,
        summary: {
          totalProducts: products?.length || 0,
          lowStockProducts: products?.filter(p => p.quantity_in_stock < p.threshold).length || 0,
          totalPurchaseOrders: purchaseOrders?.length || 0,
          pendingOrders: purchaseOrders?.filter(o => o.delivery_status === 'pending').length || 0,
          totalInvoices: invoices?.length || 0,
        }
      };

      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: { inventoryData },
      });

      if (error) throw error;

      setInsights(data.insights);
      toast({
        title: "Insights generated successfully",
        description: "AI analysis complete",
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
          <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground">
            AI-powered inventory analysis and recommendations
          </p>
        </div>
        <Button onClick={generateInsights} disabled={isGenerating}>
          <Sparkles className="mr-2 h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Insights"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products?.filter(p => p.quantity_in_stock < p.threshold).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchaseOrders?.filter(o => o.delivery_status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

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
