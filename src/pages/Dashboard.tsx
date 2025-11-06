import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FileText, Users, ShoppingCart } from "lucide-react";
import { LowStockAlerts } from "@/components/LowStockAlerts";

export default function Dashboard() {
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

  const totalValue = products?.reduce(
    (sum, product) => sum + (product.quantity_in_stock * Number(product.unit_price)),
    0
  ) || 0;

  const stats = [
    {
      title: "Total Products",
      value: products?.length || 0,
      icon: Package,
      color: "text-primary",
    },
    {
      title: "Total Invoices",
      value: invoices?.length || 0,
      icon: FileText,
      color: "text-success",
    },
    {
      title: "Suppliers",
      value: suppliers?.length || 0,
      icon: Users,
      color: "text-accent",
    },
    {
      title: "Purchase Orders",
      value: purchaseOrders?.length || 0,
      icon: ShoppingCart,
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your inventory system</p>
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

      {/* Inventory Value */}
      <Card>
        <CardHeader>
          <CardTitle>Total Inventory Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            ${totalValue.toFixed(2)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
