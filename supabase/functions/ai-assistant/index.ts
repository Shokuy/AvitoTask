import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, item } = await req.json();
    const SHOKVITO_API_KEY = Deno.env.get("SHOKVITO_API_KEY");
    if (!SHOKVITO_API_KEY) throw new Error("SHOKVITO_API_KEY is not configured");

    const categoryNames: Record<string, string> = {
      auto: "Транспорт",
      real_estate: "Недвижимость",
      electronics: "Электроника",
    };

    const itemInfo = `Категория: ${categoryNames[item.category] || item.category}
Название: ${item.title}
Цена: ${item.price} руб.
Описание: ${item.description || "нет"}
Параметры: ${JSON.stringify(item.params || {})}`;

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "description") {
      systemPrompt = "Ты — копирайтер для объявлений на площадке Авито. Пиши привлекательные, информативные описания товаров на русском языке. Описание должно быть 2-4 абзаца, подчёркивать преимущества и ключевые характеристики. Не используй markdown.";
      userPrompt = item.description
        ? `Улучши описание этого объявления. Сделай его более привлекательным и информативным.\n\n${itemInfo}`
        : `Придумай описание для этого объявления:\n\n${itemInfo}`;
    } else if (type === "price") {
      systemPrompt = "Ты — эксперт по ценообразованию на площадке Авито. Анализируй данные товара и давай рекомендации по рыночной цене на русском языке. Будь конкретен, укажи ценовой диапазон и обоснование.";
      userPrompt = `Оцени рыночную стоимость этого товара и дай рекомендацию по цене:\n\n${itemInfo}`;
    } else {
      throw new Error("Unknown type: " + type);
    }

    const response = await fetch("https://ai.gateway.shokvito.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SHOKVITO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Слишком много запросов, попробуйте позже" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Необходимо пополнить баланс AI" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "Не удалось получить ответ";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
