import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductFormProps {
  product?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductForm({ product, onClose, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: product || {
      category: 'restaurante'
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const productData = {
        name: data.name,
        category: data.category,
        current_stock: parseInt(data.current_stock),
        quantity: parseInt(data.current_stock),
        unit_price: parseFloat(data.unit_price),
        price: parseFloat(data.unit_price),
        minimum_stock: parseInt(data.minimum_stock),
        threshold: parseInt(data.minimum_stock),
        vendor_name: data.vendor_name,
        expiration_date: data.expiration_date || null,
        unit: data.unit || 'unidades',
      };

      if (product?.id) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert([productData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: product ? t('products.updated') : t('products.created') });
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Product mutation error:', error);
      toast({
        title: product ? 'Erro ao atualizar produto' : 'Erro ao criar produto',
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? t('products.editProduct') : t('products.addProduct')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                {...register("name", { required: "Nome é obrigatório" })}
                placeholder="Ex: Queijo Mussarela"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select
                defaultValue={watch("category") || "restaurante"}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="padaria">{t('products.categories.bakery')}</SelectItem>
                  <SelectItem value="restaurante">{t('products.categories.restaurant')}</SelectItem>
                  <SelectItem value="bar">{t('products.categories.bar')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidade de Medida *</Label>
              <Select
                defaultValue={watch("unit") || "unidades"}
                onValueChange={(value) => setValue("unit", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                  <SelectItem value="litros">Litros</SelectItem>
                  <SelectItem value="unidades">Unidades</SelectItem>
                  <SelectItem value="gramas">Gramas</SelectItem>
                  <SelectItem value="ml">Mililitros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_stock">Quantidade em Estoque *</Label>
              <Input
                id="current_stock"
                type="number"
                min="0"
                {...register("current_stock", { required: "Quantidade é obrigatória" })}
                placeholder="0"
              />
              {errors.current_stock && (
                <p className="text-sm text-destructive">{errors.current_stock.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_price">Preço Unitário (R$) *</Label>
              <Input
                id="unit_price"
                type="number"
                min="0"
                step="0.01"
                {...register("unit_price", { required: "Preço é obrigatório" })}
                placeholder="0.00"
              />
              {errors.unit_price && (
                <p className="text-sm text-destructive">{errors.unit_price.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_stock">Estoque Mínimo *</Label>
              <Input
                id="minimum_stock"
                type="number"
                min="0"
                {...register("minimum_stock", { required: "Estoque mínimo é obrigatório" })}
                placeholder="10"
              />
              {errors.minimum_stock && (
                <p className="text-sm text-destructive">{errors.minimum_stock.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor_name">Fornecedor *</Label>
              <Input
                id="vendor_name"
                {...register("vendor_name", { required: "Fornecedor é obrigatório" })}
                placeholder="Nome do fornecedor"
              />
              {errors.vendor_name && (
                <p className="text-sm text-destructive">{errors.vendor_name.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration_date">Data de Validade</Label>
              <Input
                id="expiration_date"
                type="date"
                {...register("expiration_date")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
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
