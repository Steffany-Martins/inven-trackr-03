import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface PurchaseOrdersTableProps {
  purchaseOrders: any[];
  isLoading: boolean;
  onEdit?: (order: any) => void;
  onDelete?: (id: string) => void;
  onReorder?: (order: any) => void;
}

export function PurchaseOrdersTable({
  purchaseOrders,
  isLoading,
  onEdit,
  onDelete,
  onReorder,
}: PurchaseOrdersTableProps) {
  if (isLoading) {
    return <div className="text-center py-8">Carregando pedidos...</div>;
  }

  if (purchaseOrders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum pedido encontrado. Crie seu primeiro pedido para começar.
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "secondary",
      confirmed: "default",
      delivered: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Número do Pedido</TableHead>
          <TableHead>Data do Pedido</TableHead>
          <TableHead>Previsão de Entrega</TableHead>
          <TableHead>Valor Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Itens</TableHead>
          {(onEdit || onDelete || onReorder) && <TableHead>Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {purchaseOrders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium font-mono">{order.order_number}</TableCell>
            <TableCell>
              {order.order_date ? format(new Date(order.order_date), "dd/MM/yyyy") : "-"}
            </TableCell>
            <TableCell>
              {order.expected_delivery
                ? format(new Date(order.expected_delivery), "dd/MM/yyyy")
                : "-"}
            </TableCell>
            <TableCell>R$ {order.total_value?.toFixed(2) || "0.00"}</TableCell>
            <TableCell>{getStatusBadge(order.status)}</TableCell>
            <TableCell>
              <Badge variant="outline">{order.purchase_order_items?.length || 0} itens</Badge>
            </TableCell>
            {(onEdit || onDelete || onReorder) && (
              <TableCell>
                <div className="flex gap-2">
                  {onReorder && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onReorder(order)}
                      title="Refazer pedido"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(order)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(order.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
