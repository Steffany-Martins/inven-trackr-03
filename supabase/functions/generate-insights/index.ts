import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { inventoryData } = await req.json();
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");

    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em gestão de inventário e análise de dados para restaurantes. Analise os dados de inventário fornecidos e gere insights acionáveis em português, incluindo:

1. **Alertas de Estoque Baixo e Recomendações de Reabastecimento**
   - Identifique produtos críticos abaixo do estoque mínimo
   - Sugira quantidades ideais de reabastecimento
   - Calcule o tempo estimado até ruptura de estoque

2. **Tendências de Movimentação de Inventário**
   - Analise padrões de consumo por categoria
   - Identifique produtos de alta e baixa rotatividade
   - Detecte variações sazonais se aplicável

3. **Otimização de Custos**
   - Identifique produtos com alto custo de armazenagem
   - Sugira estratégias para redução de desperdício
   - Analise relação custo-benefício por fornecedor

4. **Análise de Performance de Fornecedores**
   - Avalie pontualidade de entregas
   - Compare preços entre fornecedores
   - Identifique fornecedores com melhor custo-benefício

5. **Insights por Categoria de Produto**
   - Analise performance por categoria (Padaria, Restaurante, Bar)
   - Identifique categorias com maior margem
   - Sugira ajustes no mix de produtos

6. **Recomendações para Melhorar o Giro de Estoque**
   - Identifique produtos parados ou com baixo giro
   - Sugira ações para produtos de baixa rotatividade
   - Calcule o giro de estoque ideal por categoria

**Formato da Resposta:**
- Use marcadores e subtítulos claros
- Seja objetivo e focado em ações práticas
- Inclua números e métricas sempre que possível
- Priorize insights de maior impacto financeiro
- Limite a resposta a 800 palavras máximo`;

    const userPrompt = `Analise os seguintes dados de inventário do restaurante Zola Pizza:

**Resumo:**
- Total de produtos: ${inventoryData.summary.totalProducts}
- Produtos com estoque baixo: ${inventoryData.summary.lowStockProducts}
- Total de pedidos de compra: ${inventoryData.summary.totalPurchaseOrders}
- Pedidos pendentes: ${inventoryData.summary.pendingOrders}
- Total de faturas: ${inventoryData.summary.totalInvoices}

**Produtos Detalhados:**
${JSON.stringify(inventoryData.products?.slice(0, 20) || [], null, 2)}

**Pedidos de Compra Recentes:**
${JSON.stringify(inventoryData.purchaseOrders?.slice(0, 10) || [], null, 2)}

**Faturas Recentes:**
${JSON.stringify(inventoryData.invoices?.slice(0, 10) || [], null, 2)}

Gere insights acionáveis focados em otimização de custos, redução de desperdício e melhoria da eficiência operacional.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n${userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google AI API error:", response.status, errorText);
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from AI model");
    }

    const insights = data.candidates[0].content.parts[0].text;

    return new Response(
      JSON.stringify({ insights }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in generate-insights function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});