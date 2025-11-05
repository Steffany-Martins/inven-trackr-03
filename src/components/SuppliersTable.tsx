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

interface SuppliersTableProps {
  suppliers: any[];
  isLoading: boolean;
  onEdit: (supplier: any) => void;
  onDelete: (id: string) => void;
}

export function SuppliersTable({
  suppliers,
  isLoading,
  onEdit,
  onDelete,
}: SuppliersTableProps) {
  if (isLoading) {
    return <div className="text-center py-8">Loading suppliers...</div>;
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No suppliers found. Add your first supplier to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Phone Number</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Added</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliers.map((supplier) => (
          <TableRow key={supplier.id}>
            <TableCell className="font-medium">{supplier.name}</TableCell>
            <TableCell>{supplier.phone_number}</TableCell>
            <TableCell>{supplier.address}</TableCell>
            <TableCell>
              {new Date(supplier.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(supplier)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(supplier.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
