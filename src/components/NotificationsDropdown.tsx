import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function NotificationsDropdown() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const [lowStock, fraud] = await Promise.all([
        supabase
          .from("low_stock_alerts")
          .select("*, products(name)")
          .eq("acknowledged", false)
          .order("sent_at", { ascending: false })
          .limit(10),
        supabase
          .from("fraud_alerts")
          .select("*")
          .eq("resolved", false)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (lowStock.error) console.error("Low stock error:", lowStock.error);
      if (fraud.error) console.error("Fraud error:", fraud.error);

      return {
        lowStock: lowStock.data || [],
        fraud: fraud.data || [],
      };
    },
    refetchInterval: 30000,
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "low_stock" | "fraud" }) => {
      if (type === "low_stock") {
        const { error } = await supabase
          .from("low_stock_alerts")
          .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("fraud_alerts")
          .update({ resolved: true, resolved_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Alerta resolvido com sucesso" });
    },
  });

  const totalAlerts = (alerts?.lowStock.length || 0) + (alerts?.fraud.length || 0);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalAlerts > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalAlerts}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2 font-semibold border-b">
          Notificações ({totalAlerts})
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {alerts?.lowStock.map((alert: any) => (
            <DropdownMenuItem
              key={alert.id}
              className="flex flex-col items-start p-3 cursor-pointer"
              onClick={() => resolveAlertMutation.mutate({ id: alert.id, type: "low_stock" })}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">Estoque Baixo</span>
                <Badge variant="destructive">
                  {alert.alert_type || "Alerta"}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {alert.products?.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {alert.sent_at && format(new Date(alert.sent_at), "dd/MM/yyyy HH:mm")}
              </span>
            </DropdownMenuItem>
          ))}
          {alerts?.fraud.map((alert: any) => (
            <DropdownMenuItem
              key={alert.id}
              className="flex flex-col items-start p-3 cursor-pointer"
              onClick={() => resolveAlertMutation.mutate({ id: alert.id, type: "fraud" })}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">Alerta de Segurança</span>
                <Badge variant={getSeverityColor(alert.severity)}>
                  {alert.severity}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {alert.description}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(alert.created_at), "dd/MM/yyyy HH:mm")}
              </span>
            </DropdownMenuItem>
          ))}
          {totalAlerts === 0 && (
            <div className="p-4 text-center text-muted-foreground">
              Nenhuma notificação
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
