import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InvoiceFormProps {
  onClose: () => void;
}

export function InvoiceForm({ onClose }: InvoiceFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { register, handleSubmit, control, watch, setValue } = useForm({
    defaultValues: {
      supplier_name: "",
      invoice_number: "",
      invoice_date: new Date().toISOString().split('T')[0],
      items: [{ product_name: "", quantity: "1", price: "0", unit: "unidades" }],
    },
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchItems = watch("items");

  const total = watchItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    return sum + qty * price;
  }, 0);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const productsArray = data.items.map((item: any) => ({
        name: item.product_name,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        price: parseFloat(item.price),
      }));

      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert([
          {
            invoice_number: data.invoice_number,
            supplier_name: data.supplier_name,
            invoice_date: data.invoice_date,
            total_value: total,
            status: 'confirmed',
            phone_number: '+55 11 00000-0000',
            image_url: '/placeholder.svg',
            products: productsArray,
          },
        ]);

      if (invoiceError) throw invoiceError;
    },
    onSuccess: () => {
      toast({ title: "Fatura criada com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onClose();
    },
    onError: (error: any) => {
      console.error('Invoice creation error:', error);
      toast({
        title: "Erro ao criar fatura",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Fatura</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Número da Fatura *</Label>
              <Input
                id="invoice_number"
                {...register("invoice_number", { required: true })}
                placeholder="FAT-2025-XXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_name">Fornecedor *</Label>
              <Input
                id="supplier_name"
                {...register("supplier_name", { required: true })}
                placeholder="Nome do fornecedor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_date">Data da Fatura *</Label>
              <Input
                id="invoice_date"
                type="date"
                {...register("invoice_date", { required: true })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Produtos da Fatura *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ product_name: "", quantity: "1", price: "0", unit: "unidades" })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produto
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-end border p-3 rounded-lg bg-muted/30">
                <div className="flex-1 space-y-2">
                  <Label>Nome do Produto</Label>
                  <Input
                    {...register(`items.${index}.product_name`, { required: true })}
                    placeholder="Ex: Queijo Mussarela"
                  />
                </div>

                <div className="w-28 space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...register(`items.${index}.quantity`, { required: true })}
                    placeholder="1"
                  />
                </div>

                <div className="w-32 space-y-2">
                  <Label>Unidade</Label>
                  <Select
                    defaultValue="unidades"
                    onValueChange={(value) => setValue(`items.${index}.unit`, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="litros">Litros</SelectItem>
                      <SelectItem value="unidades">Unidades</SelectItem>
                      <SelectItem value="gramas">Gramas</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-32 space-y-2">
                  <Label>Preço Unit. (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...register(`items.${index}.price`, { required: true })}
                    placeholder="0.00"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  title="Remover produto"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end items-center gap-4 pt-4 border-t">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <div className="text-3xl font-bold text-primary">
                R$ {total.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar Fatura"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
