import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
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
import { formatCNPJ, validateCNPJ } from "@/utils/cnpjValidator";

interface SupplierFormProps {
  supplier?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplierForm({ supplier, onClose, onSuccess }: SupplierFormProps) {
  const { toast } = useToast();
  const [cnpjValue, setCnpjValue] = useState(supplier?.cnpj || "");
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
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
    if (!validateCNPJ(cnpjValue)) {
      toast({
        title: "CNPJ inválido",
        description: "Por favor, insira um CNPJ válido",
        variant: "destructive"
      });
      return;
    }
    mutation.mutate({ ...data, cnpj: cnpjValue });
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpjValue(formatted);
    setValue("cnpj", formatted);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit" : "Add"} Supplier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input
              id="cnpj"
              value={cnpjValue}
              onChange={handleCNPJChange}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
            <p className="text-xs text-muted-foreground">Formato: 00.000.000/0000-00</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Fornecedor *</Label>
            <Input
              id="name"
              {...register("name", { required: "Nome é obrigatório" })}
              placeholder="Digite o nome do fornecedor"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              {...register("phone", { required: "Telefone é obrigatório" })}
              placeholder="(00) 00000-0000"
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
            <Label htmlFor="contact">Pessoa de Contato</Label>
            <Input
              id="contact"
              {...register("contact")}
              placeholder="Nome da pessoa de contato"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_time_days">Prazo de Entrega (dias)</Label>
            <Input
              id="delivery_time_days"
              type="number"
              min="0"
              {...register("delivery_time_days")}
              placeholder="Ex: 7"
            />
            <p className="text-xs text-muted-foreground">Tempo médio de entrega em dias úteis</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
