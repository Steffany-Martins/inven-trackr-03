import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Image, Sparkles, Upload } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ProductFormProps {
  product?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductForm({ product, onClose, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(product?.supplier_id || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.product_image_path || null);
  const [aiImageQuery, setAiImageQuery] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: product || {
      category: 'restaurante'
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      let imagePath = product?.product_image_path || null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        imagePath = publicUrl;
      }

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
        supplier_id: selectedSupplierId,
        expiration_date: data.expiration_date || null,
        unit: data.unit || 'unidades',
        product_image_path: imagePath,
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAiImage = async () => {
    if (!aiImageQuery.trim()) {
      toast({
        title: "Digite uma descrição",
        description: "Por favor, descreva o produto para gerar a imagem.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const query = encodeURIComponent(aiImageQuery);
      const imageUrl = `https://source.unsplash.com/featured/400x400/?${query},food,product`;
      setImagePreview(imageUrl);
      toast({
        title: "Imagem sugerida",
        description: "Imagem do Unsplash carregada. Você pode fazer upload se preferir."
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar imagem",
        description: "Não foi possível gerar a imagem.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingImage(false);
    }
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

            <div className="space-y-2 col-span-2">
              <Label>Fornecedor</Label>
              <ToggleGroup
                type="single"
                value={selectedSupplierId || undefined}
                onValueChange={setSelectedSupplierId}
                className="flex flex-wrap gap-2 justify-start"
              >
                {suppliers.map((supplier: any) => (
                  <ToggleGroupItem
                    key={supplier.id}
                    value={supplier.id}
                    aria-label={supplier.name}
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {supplier.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {suppliers.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum fornecedor cadastrado. Cadastre fornecedores na página de Fornecedores.</p>
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

          <div className="space-y-2">
            <Label>Imagem do Produto</Label>
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="ai">
                  <Sparkles className="w-4 h-4 mr-2" />
                  IA Sugestão
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="space-y-3">
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ou escolha uma imagem gerada por IA abaixo
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: queijo mussarela, pizza, pão"
                    value={aiImageQuery}
                    onChange={(e) => setAiImageQuery(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={generateAiImage}
                    disabled={isGeneratingImage}
                    variant="secondary"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isGeneratingImage ? "Gerando..." : "Gerar IA"}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="ai" className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: queijo mussarela, pizza, pão"
                    value={aiImageQuery}
                    onChange={(e) => setAiImageQuery(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={generateAiImage}
                    disabled={isGeneratingImage}
                  >
                    {isGeneratingImage ? "Gerando..." : "Gerar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Imagens sugeridas do Unsplash
                </p>
              </TabsContent>
            </Tabs>
            {imagePreview && (
              <div className="mt-2 relative w-32 h-32 border rounded overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
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
