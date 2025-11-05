import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InvoicesTableProps {
  invoices: any[];
  isLoading: boolean;
}

export function InvoicesTable({ invoices, isLoading }: InvoicesTableProps) {
  if (isLoading) {
    return <div className="text-center py-8">Loading invoices...</div>;
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No invoices found. Create your first invoice to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Shipping</TableHead>
          <TableHead>Tax</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
            <TableCell>{invoice.customer_name}</TableCell>
            <TableCell>{invoice.phone_number}</TableCell>
            <TableCell>{invoice.invoice_items?.length || 0}</TableCell>
            <TableCell>${Number(invoice.shipping_price).toFixed(2)}</TableCell>
            <TableCell>${Number(invoice.tax_amount).toFixed(2)}</TableCell>
            <TableCell className="font-bold">
              ${Number(invoice.total_amount).toFixed(2)}
            </TableCell>
            <TableCell>
              {new Date(invoice.created_at).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
