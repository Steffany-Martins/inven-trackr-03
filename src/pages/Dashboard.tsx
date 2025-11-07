import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FileText, Users, ShoppingCart, AlertTriangle, Calendar, TrendingUp } from "lucide-react";
import { LowStockAlerts } from "@/components/LowStockAlerts";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { t } = useTranslation();

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: purchaseOrders } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("*");
      if (error) throw error;
      return data;
    },
  });

  const lowStockCount = products?.filter(p => p.quantity_in_stock < p.threshold).length || 0;
  
  const expiringItems = products?.filter(p => {
    if (!p.expiration_date) return false;
    const daysUntilExpiry = Math.floor(
      (new Date(p.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  }).length || 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlySales = invoices?.filter(invoice => {
    const invoiceDate = new Date(invoice.created_at);
    return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
  }).reduce((sum, invoice) => sum + Number(invoice.total_amount), 0) || 0;

  const stats = [
    {
      title: t("dashboard.totalProducts"),
      value: products?.length || 0,
      icon: Package,
      color: "text-primary",
    },
    {
      title: t("dashboard.lowStockItems"),
      value: lowStockCount,
      icon: AlertTriangle,
      color: "text-warning",
    },
    {
      title: t("dashboard.expiringItems"),
      value: expiringItems,
      icon: Calendar,
      color: "text-destructive",
    },
    {
      title: t("dashboard.monthlySales"),
      value: `$${monthlySales.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-success",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.description")}</p>
      </div>

      <LowStockAlerts />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={cn("h-4 w-4", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
