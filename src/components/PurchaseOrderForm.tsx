import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface PurchaseOrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function PurchaseOrderForm({ onClose, onSuccess }: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const { register, handleSubmit, setValue } = useForm();

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("purchase_orders").insert([
        {
          product_id: data.product_id,
          supplier_id: data.supplier_id,
          quantity: parseInt(data.quantity),
          price: parseFloat(data.price),
          delivery_date: data.delivery_date || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Purchase order created successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to create purchase order", variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select onValueChange={(value) => setValue("product_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Supplier</Label>
            <Select onValueChange={(value) => setValue("supplier_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              {...register("quantity", { required: true })}
              placeholder="Enter quantity"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Total Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register("price", { required: true })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_date">Expected Delivery Date</Label>
            <Input
              id="delivery_date"
              type="date"
              {...register("delivery_date")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
