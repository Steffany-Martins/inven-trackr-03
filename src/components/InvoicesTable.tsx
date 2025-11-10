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
import { ChevronLeft, ChevronRight, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvoicesTableProps {
  invoices: any[];
  isLoading: boolean;
}

const ITEMS_PER_PAGE = 10;

export function InvoicesTable({ invoices, isLoading }: InvoicesTableProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentInvoices = invoices.slice(startIndex, endIndex);

  if (isLoading) {
    return <div className="text-center py-8">Carregando faturas...</div>;
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma fatura encontrada. Adicione sua primeira fatura para começar.
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Fatura</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentInvoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.invoice_number || 'N/A'}</TableCell>
              <TableCell>{invoice.supplier_name || 'N/A'}</TableCell>
              <TableCell className="font-bold">
                R$ {Number(invoice.total_value || 0).toFixed(2)}
              </TableCell>
              <TableCell>
                {getStatusBadge(invoice.status)}
              </TableCell>
              <TableCell>
                {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('pt-BR') : new Date(invoice.created_at).toLocaleDateString('pt-BR')}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedInvoice(invoice)}
                  title="Ver Detalhes"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver
                </Button>
              </TableCell>
            </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {Math.min(endIndex, invoices.length)} de {invoices.length} faturas
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <div className="text-sm">
              Página {currentPage} de {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fatura {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Fornecedor</p>
                  <p>{selectedInvoice.supplier_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-semibold">Valor Total</p>
                  <p className="text-lg font-bold">R$ {Number(selectedInvoice.total_value || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-semibold">Status</p>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                <div>
                  <p className="font-semibold">Data</p>
                  <p>{selectedInvoice.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString('pt-BR') : new Date(selectedInvoice.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {selectedInvoice.products && selectedInvoice.products.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Produtos</p>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Preço Unit.</TableHead>
                          <TableHead>Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.products.map((product: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>{product.quantity}</TableCell>
                            <TableCell>{product.unit}</TableCell>
                            <TableCell>R$ {Number(product.price || 0).toFixed(2)}</TableCell>
                            <TableCell>R$ {(Number(product.quantity || 0) * Number(product.price || 0)).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {selectedInvoice.extracted_text && (
                <div>
                  <p className="font-semibold mb-2">Texto Extraído</p>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">{selectedInvoice.extracted_text}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
