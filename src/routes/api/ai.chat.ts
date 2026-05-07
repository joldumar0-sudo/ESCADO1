import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const MODEL = 'google/gemini-2.5-flash';

const ChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(50),
});

export const Route = createFileRoute('/api/ai/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');
        if (!token) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

        // Validate user
        const { data: claims, error: claimErr } = await supabaseAdmin.auth.getClaims(token);
        if (claimErr || !claims?.claims?.sub) {
          return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response(JSON.stringify({ error: 'AI gateway não configurado' }), { status: 500 });

        let parsed;
        try {
          parsed = ChatSchema.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ error: 'Pedido inválido' }), { status: 400 });
        }
        const body = parsed;

        // Build context from group content (simple RAG: include titles + snippets)
        const [{ data: docs }, { data: pages }] = await Promise.all([
          supabaseAdmin.from('documents').select('title,description,category').limit(50),
          supabaseAdmin.from('info_pages').select('title,category,content').limit(30),
        ]);

        const context = [
          'DOCUMENTOS DISPONÍVEIS NA BIBLIOTECA:',
          ...(docs ?? []).map((d) => `- ${d.title}${d.category ? ` [${d.category}]` : ''}${d.description ? `: ${d.description}` : ''}`),
          '',
          'PÁGINAS INFORMATIVAS DO GRUPO:',
          ...(pages ?? []).map((p) => `## ${p.title}${p.category ? ` (${p.category})` : ''}\n${(p.content ?? '').slice(0, 1500)}`),
        ].join('\n');

        const systemPrompt = `Você é o assistente do Grupo Escoteiro. Responda em português, de forma amigável, clara e adequada para jovens. Use o contexto abaixo do grupo para responder. Se não souber, diga e sugira procurar um dirigente.\n\n=== CONTEXTO DO GRUPO ===\n${context}\n=== FIM DO CONTEXTO ===`;

        const upstream = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'system', content: systemPrompt }, ...body.messages],
            stream: false,
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text();
          if (upstream.status === 429) return new Response(JSON.stringify({ error: 'Muitos pedidos. Tente em instantes.' }), { status: 429 });
          if (upstream.status === 402) return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), { status: 402 });
          return new Response(JSON.stringify({ error: 'Falha no AI gateway', detail: text }), { status: 500 });
        }

        const data = await upstream.json();
        const content: string = data.choices?.[0]?.message?.content ?? '';
        return new Response(JSON.stringify({ content }), { headers: { 'Content-Type': 'application/json' } });
      },
    },
  },
});
