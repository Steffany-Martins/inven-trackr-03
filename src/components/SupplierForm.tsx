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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface SupplierFormProps {
  supplier?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplierForm({ supplier, onClose, onSuccess }: SupplierFormProps) {
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: supplier || {},
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (supplier?.id) {
        const { error } = await supabase
          .from("suppliers")
          .update(data)
          .eq("id", supplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `Supplier ${supplier ? "updated" : "created"} successfully` });
      onSuccess();
    },
    onError: () => {
      toast({
        title: `Failed to ${supplier ? "update" : "create"} supplier`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit" : "Add"} Supplier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Supplier Name</Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required" })}
              placeholder="Enter supplier name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              {...register("phone", { required: "Phone is required" })}
              placeholder="Enter phone number"
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="Enter supplier email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact Person</Label>
            <Input
              id="contact"
              {...register("contact")}
              placeholder="Enter contact person name"
            />
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
