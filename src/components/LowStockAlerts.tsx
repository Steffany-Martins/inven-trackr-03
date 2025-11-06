import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LowStockAlerts() {
  const { data: lowStockProducts } = useQuery({
    queryKey: ["low-stock-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*");
      
      if (error) throw error;
      
      return data?.filter(
        (product) => product.quantity_in_stock < product.threshold
      ) || [];
    },
  });

  if (!lowStockProducts || lowStockProducts.length === 0) {
    return null;
  }

  return (
    <Card className="border-warning">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Low Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {lowStockProducts.map((product) => (
          <Alert key={product.id} variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{product.name}</AlertTitle>
            <AlertDescription>
              Only {product.quantity_in_stock} units left (Threshold: {product.threshold})
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
