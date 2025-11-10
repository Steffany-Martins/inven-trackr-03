import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface InvoicesTableProps {
  invoices: any[];
  isLoading: boolean;
}

export function InvoicesTable({ invoices, isLoading }: InvoicesTableProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted">
              <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
              <TableCell>{invoice.customer_name}</TableCell>
              <TableCell className="font-bold">
                ${Number(invoice.total_amount).toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(invoice.status)}>
                  {invoice.status}
                </Badge>
              </TableCell>
              <TableCell>
                {invoice.image_url ? (
                  <button
                    onClick={() => setSelectedInvoice(invoice)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Image
                  </button>
                ) : (
                  <span className="text-muted-foreground text-sm">No image</span>
                )}
              </TableCell>
              <TableCell>
                {new Date(invoice.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedInvoice?.image_url && (
            <div className="space-y-4">
              <img
                src={selectedInvoice.image_url}
                alt="Invoice"
                className="w-full rounded-lg"
              />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Customer</p>
                  <p>{selectedInvoice.customer_name}</p>
                </div>
                <div>
                  <p className="font-semibold">Total Amount</p>
                  <p>${Number(selectedInvoice.total_amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-semibold">Status</p>
                  <p>{selectedInvoice.status}</p>
                </div>
                <div>
                  <p className="font-semibold">Date</p>
                  <p>{new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedInvoice.notes && (
                <div>
                  <p className="font-semibold">Notes</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
