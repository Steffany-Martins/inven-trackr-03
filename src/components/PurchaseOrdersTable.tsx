import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PurchaseOrdersTableProps {
  orders: any[];
  isLoading: boolean;
  onUpdateStatus: (id: string, status: string) => void;
}

export function PurchaseOrdersTable({
  orders,
  isLoading,
  onUpdateStatus,
}: PurchaseOrdersTableProps) {
  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No purchase orders found. Create your first order to get started.
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-success";
      case "in_transit":
        return "bg-warning";
      case "cancelled":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Delivery Date</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">
              {order.products?.name || "N/A"}
            </TableCell>
            <TableCell>{order.suppliers?.name || "N/A"}</TableCell>
            <TableCell>{order.quantity}</TableCell>
            <TableCell>${Number(order.price).toFixed(2)}</TableCell>
            <TableCell>
              <Select
                value={order.delivery_status}
                onValueChange={(value) => onUpdateStatus(order.id, value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue>
                    <Badge className={getStatusColor(order.delivery_status)}>
                      {order.delivery_status.replace("_", " ")}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              {order.delivery_date
                ? new Date(order.delivery_date).toLocaleDateString()
                : "Not set"}
            </TableCell>
            <TableCell>
              {new Date(order.created_at).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
