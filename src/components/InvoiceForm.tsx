import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
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
import { Plus, Trash2 } from "lucide-react";
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
      customer_name: "",
      phone_number: "",
      shipping_price: "0",
      tax_amount: "0",
      items: [{ product_id: "", item_name: "", quantity: "1", price_per_item: "0", deduct_stock: true }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchItems = watch("items");
  const watchShipping = watch("shipping_price");
  const watchTax = watch("tax_amount");

  const subtotal = watchItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price_per_item) || 0;
    return sum + qty * price;
  }, 0);

  const total = subtotal + parseFloat(watchShipping || "0") + parseFloat(watchTax || "0");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const invoiceNumber = `INV-${Date.now()}`;

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert([
          {
            invoice_number: invoiceNumber,
            customer_name: data.customer_name,
            phone_number: data.phone_number,
            shipping_price: parseFloat(data.shipping_price),
            tax_amount: parseFloat(data.tax_amount),
            total_amount: total,
          },
        ])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Process each item
      for (const item of data.items) {
        let productId = item.product_id;
        let itemName = item.item_name;

        // If product_id is empty, create new product
        if (!productId && itemName) {
          const { data: newProduct, error: productError } = await supabase
            .from("products")
            .insert([
              {
                name: itemName,
                category: "restaurante",
                vendor_name: "N/A",
                unit_price: parseFloat(item.price_per_item),
                quantity_in_stock: 0,
                threshold: 10,
              },
            ])
            .select()
            .single();

          if (productError) throw productError;
          productId = newProduct.id;
        }

        // Create invoice item
        const { error: itemError } = await supabase
          .from("invoice_items")
          .insert([
            {
              invoice_id: invoice.id,
              product_id: productId,
              item_name: itemName || products?.find(p => p.id === productId)?.name || "",
              quantity: parseInt(item.quantity),
              price_per_item: parseFloat(item.price_per_item),
              subtotal: parseInt(item.quantity) * parseFloat(item.price_per_item),
            },
          ]);

        if (itemError) throw itemError;

        // Deduct stock if checkbox is checked
        if (item.deduct_stock && productId) {
          const product = products?.find(p => p.id === productId);
          if (product) {
            const newQuantity = product.quantity_in_stock - parseInt(item.quantity);
            await supabase
              .from("products")
              .update({ quantity_in_stock: Math.max(0, newQuantity) })
              .eq("id", productId);
          }
        }
      }
    },
    onSuccess: () => {
      toast({ title: t("invoices.title") + " created successfully" });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create invoice", 
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
          <DialogTitle>{t("invoices.addInvoice")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">{t("invoices.customerName")}</Label>
              <Input
                id="customer_name"
                {...register("customer_name", { required: true })}
                placeholder={t("invoices.customerName")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">{t("invoices.phoneNumber")}</Label>
              <Input
                id="phone_number"
                {...register("phone_number", { required: true })}
                placeholder={t("invoices.phoneNumber")}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t("invoices.items")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ product_id: "", item_name: "", quantity: "1", price_per_item: "0", deduct_stock: true })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("invoices.addItem")}
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-end border p-3 rounded-lg">
                <div className="flex-1 space-y-2">
                  <Label>{t("products.name")}</Label>
                  <Select
                    onValueChange={(value) => {
                      setValue(`items.${index}.product_id`, value);
                      const product = products?.find((p) => p.id === value);
                      if (product) {
                        setValue(`items.${index}.item_name`, product.name);
                        setValue(`items.${index}.price_per_item`, String(product.unit_price));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar produto existente" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - ${product.unit_price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    {...register(`items.${index}.item_name`)}
                    placeholder="Ou digite nome do novo produto"
                  />
                </div>

                <div className="w-24 space-y-2">
                  <Label>{t("invoices.quantity")}</Label>
                  <Input
                    type="number"
                    {...register(`items.${index}.quantity`)}
                    placeholder="1"
                  />
                </div>

                <div className="w-32 space-y-2">
                  <Label>{t("invoices.pricePerItem")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.price_per_item`)}
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`deduct-${index}`}
                    checked={watchItems[index]?.deduct_stock}
                    onCheckedChange={(checked) => 
                      setValue(`items.${index}.deduct_stock`, checked as boolean)
                    }
                  />
                  <Label htmlFor={`deduct-${index}`} className="text-xs whitespace-nowrap">
                    {t("invoices.deductStock")}
                  </Label>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shipping_price">{t("invoices.shippingPrice")} ($)</Label>
              <Input
                id="shipping_price"
                type="number"
                step="0.01"
                {...register("shipping_price")}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_amount">{t("invoices.taxAmount")} ($)</Label>
              <Input
                id="tax_amount"
                type="number"
                step="0.01"
                {...register("tax_amount")}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("invoices.totalAmount")}</Label>
              <div className="text-2xl font-bold text-primary">
                ${total.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
