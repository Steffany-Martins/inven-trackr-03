import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductsTableProps {
  products: any[];
  isLoading: boolean;
  onEdit: (product: any) => void;
  onDelete: (id: string) => void;
}

export function ProductsTable({
  products,
  isLoading,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  if (isLoading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No products found. Add your first product to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Expiration</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const isLowStock = product.quantity_in_stock <= product.threshold;
          return (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell>{product.quantity_in_stock}</TableCell>
              <TableCell>${Number(product.unit_price).toFixed(2)}</TableCell>
              <TableCell>{product.vendor_name}</TableCell>
              <TableCell>
                {product.expiration_date
                  ? new Date(product.expiration_date).toLocaleDateString()
                  : "N/A"}
              </TableCell>
              <TableCell>
                {isLowStock ? (
                  <Badge variant="destructive">Low Stock</Badge>
                ) : (
                  <Badge variant="default" className="bg-success">In Stock</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
