import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
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

interface ProductFormProps {
  product?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductForm({ product, onClose, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: product || {},
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (product?.id) {
        const { error } = await supabase
          .from("products")
          .update(data)
          .eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `Product ${product ? "updated" : "created"} successfully` });
      onSuccess();
    },
    onError: () => {
      toast({
        title: `Failed to ${product ? "update" : "create"} product`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate({
      ...data,
      quantity_in_stock: parseInt(data.quantity_in_stock),
      unit_price: parseFloat(data.unit_price),
      threshold: parseInt(data.threshold),
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Edit" : "Add"} Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                {...register("name", { required: "Name is required" })}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                {...register("category", { required: "Category is required" })}
                placeholder="Enter category"
              />
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity_in_stock">Quantity in Stock</Label>
              <Input
                id="quantity_in_stock"
                type="number"
                {...register("quantity_in_stock", { required: "Quantity is required" })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price ($)</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                {...register("unit_price", { required: "Price is required" })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration_date">Expiration Date</Label>
              <Input
                id="expiration_date"
                type="date"
                {...register("expiration_date")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor_name">Vendor Name</Label>
              <Input
                id="vendor_name"
                {...register("vendor_name", { required: "Vendor is required" })}
                placeholder="Enter vendor name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Stock Threshold</Label>
              <Input
                id="threshold"
                type="number"
                {...register("threshold", { required: "Threshold is required" })}
                placeholder="10"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
