import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { register, handleSubmit, control, watch } = useForm({
    defaultValues: {
      customer_name: "",
      phone_number: "",
      shipping_price: "0",
      tax_amount: "0",
      items: [{ product_id: "", quantity: "1", price_per_item: "0" }],
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
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      // Create invoice
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

      // Create invoice items
      const items = data.items.map((item: any) => {
        const product = products?.find((p) => p.id === item.product_id);
        return {
          invoice_id: invoice.id,
          product_id: item.product_id,
          item_name: product?.name || "",
          quantity: parseInt(item.quantity),
          price_per_item: parseFloat(item.price_per_item),
          subtotal: parseInt(item.quantity) * parseFloat(item.price_per_item),
        };
      });

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(items);

      if (itemsError) throw itemsError;

      // Update product quantities
      for (const item of data.items) {
        const product = products?.find((p) => p.id === item.product_id);
        if (product) {
          const newQuantity = product.quantity_in_stock - parseInt(item.quantity);
          await supabase
            .from("products")
            .update({ quantity_in_stock: newQuantity })
            .eq("id", item.product_id);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Invoice created successfully" });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create invoice", variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                {...register("customer_name", { required: true })}
                placeholder="Enter customer name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                {...register("phone_number", { required: true })}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Invoice Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ product_id: "", quantity: "1", price_per_item: "0" })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Product</Label>
                  <Select
                    onValueChange={(value) => {
                      const product = products?.find((p) => p.id === value);
                      if (product) {
                        const input = document.getElementById(
                          `items.${index}.price_per_item`
                        ) as HTMLInputElement;
                        if (input) input.value = String(product.unit_price);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - ${product.unit_price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" {...register(`items.${index}.product_id`)} />
                </div>

                <div className="w-24 space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    {...register(`items.${index}.quantity`)}
                    placeholder="1"
                  />
                </div>

                <div className="w-32 space-y-2">
                  <Label>Price</Label>
                  <Input
                    id={`items.${index}.price_per_item`}
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.price_per_item`)}
                    placeholder="0.00"
                  />
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
              <Label htmlFor="shipping_price">Shipping ($)</Label>
              <Input
                id="shipping_price"
                type="number"
                step="0.01"
                {...register("shipping_price")}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_amount">Tax ($)</Label>
              <Input
                id="tax_amount"
                type="number"
                step="0.01"
                {...register("tax_amount")}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Total Amount</Label>
              <div className="text-2xl font-bold text-primary">
                ${total.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
