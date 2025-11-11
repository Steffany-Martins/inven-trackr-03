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

interface SuppliersTableProps {
  suppliers: any[];
  isLoading: boolean;
  onEdit?: (supplier: any) => void;
  onDelete?: (id: string) => void;
}

export function SuppliersTable({
  suppliers,
  isLoading,
  onEdit,
  onDelete,
}: SuppliersTableProps) {
  if (isLoading) {
    return <div className="text-center py-8">Carregando fornecedores...</div>;
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum fornecedor encontrado. Adicione seu primeiro fornecedor para começar.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>CNPJ</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Prazo Entrega</TableHead>
          {(onEdit || onDelete) && <TableHead>Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliers.map((supplier) => (
          <TableRow key={supplier.id}>
            <TableCell className="font-mono text-sm">{supplier.cnpj || "-"}</TableCell>
            <TableCell className="font-medium">{supplier.name}</TableCell>
            <TableCell>{supplier.phone || "-"}</TableCell>
            <TableCell>{supplier.email || "-"}</TableCell>
            <TableCell>{supplier.contact || "-"}</TableCell>
            <TableCell>
              {supplier.delivery_time_days ? (
                <Badge variant="secondary">{supplier.delivery_time_days} dias</Badge>
              ) : (
                "-"
              )}
            </TableCell>
            {(onEdit || onDelete) && (
              <TableCell>
                <div className="flex gap-2">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(supplier)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(supplier.id)}
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
