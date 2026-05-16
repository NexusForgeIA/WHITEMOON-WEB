import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SYSTEM_PROMPT = `Eres el asistente comercial de WhiteMoon Agencia IA...`;

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { messages } = await req.json();
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: messages.slice(-10),
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  return new Response(
    JSON.stringify({ text }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
