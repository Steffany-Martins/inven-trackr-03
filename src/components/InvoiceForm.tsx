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
      customer_name: "",
      phone_number: "",
      shipping_price: "0",
      tax_amount: "0",
      items: [{ product_id: "", item_name: "", quantity: "1", price_per_item: "0", deduct_stock: true }],
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
      let imageUrl: string | null = null;

      if (imageFile) {
        const fileName = `${invoiceNumber}-${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from("Invoices")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("Invoices")
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert([
          {
            invoice_number: invoiceNumber,
            customer_name: data.customer_name,
            phone_number: data.phone_number || "",
            total_amount: total,
            shipping_price: parseFloat(data.shipping_price),
            tax_amount: parseFloat(data.tax_amount),
          },
        ])
        .select()
        .maybeSingle();

      if (invoiceError) throw invoiceError;

      if (invoice) {
        for (const item of data.items) {
          let productId = item.product_id;

          if (!productId && item.item_name) {
            const { data: newProduct, error: productError } = await supabase
              .from("products")
              .insert([
                {
                  name: item.item_name,
                  category: "general",
                  vendor_name: "General",
                  unit_price: parseFloat(item.price_per_item),
                  quantity_in_stock: 0,
                  threshold: 10,
                },
              ])
              .select()
              .maybeSingle();

            if (productError) throw productError;
            productId = newProduct?.id;
          }

          if (item.deduct_stock && productId) {
            await supabase.from("stock_movements").insert([
              {
                product_id: productId,
                movement_type: "out",
                quantity: parseInt(item.quantity),
                reference_type: "invoice",
                reference_id: invoice.id,
                notes: `Invoice ${invoiceNumber}`,
              },
            ]);
          }
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Invoice created successfully" });
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
              <Label>Invoice Image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {imageFile ? "Change Image" : "Upload Image"}
              </Button>
              {imagePreview && (
                <div className="mt-2 relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}
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
