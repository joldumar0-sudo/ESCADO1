import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/assistente")({ component: Assistant });

type Conv = { id: string; title: string; updated_at: string };
type AIMsg = { id: string; role: "user" | "assistant" | "system"; content: string; created_at: string };

function Assistant() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<AIMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    if (!user) return;
    const { data } = await supabase.from("ai_conversations").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    setConvs((data ?? []) as Conv[]);
  };
  useEffect(() => { loadConvs(); }, [user]);

  useEffect(() => {
    if (!active) { setMessages([]); return; }
    supabase.from("ai_messages").select("*").eq("conversation_id", active.id).order("created_at").then(({ data }) => {
      setMessages((data ?? []) as AIMsg[]);
    });
  }, [active]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages, sending]);

  const newConv = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("ai_conversations").insert({ user_id: user.id, title: "Nova conversa" }).select().single();
    if (error) return toast.error(error.message);
    setActive(data as Conv); loadConvs();
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    let conv = active;
    if (!conv) {
      const { data, error } = await supabase.from("ai_conversations").insert({ user_id: user.id, title: input.slice(0, 40) }).select().single();
      if (error) return toast.error(error.message);
      conv = data as Conv;
      setActive(conv);
    }
    const userMsg = input.trim(); setInput("");
    const optimistic: AIMsg = { id: crypto.randomUUID(), role: "user", content: userMsg, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    await supabase.from("ai_messages").insert({ conversation_id: conv.id, role: "user", content: userMsg });

    setSending(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [...messages, optimistic].map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      const assistant: AIMsg = { id: crypto.randomUUID(), role: "assistant", content: data.content, created_at: new Date().toISOString() };
      setMessages((m) => [...m, assistant]);
      await supabase.from("ai_messages").insert({ conversation_id: conv.id, role: "assistant", content: data.content });
      loadConvs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao consultar IA");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Assistente IA</h1>
          <p className="text-muted-foreground">Tire dúvidas com base no conteúdo do grupo</p>
        </div>
        <Button onClick={newConv} variant="outline"><MessageSquarePlus className="mr-2 h-4 w-4" /> Nova</Button>
      </header>

      <div className="grid h-[65vh] gap-4 md:grid-cols-[260px_1fr]">
        <Card className="overflow-y-auto p-2">
          {convs.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhuma conversa ainda.</div>}
          {convs.map((c) => (
            <button key={c.id} onClick={() => setActive(c)} className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition ${active?.id === c.id ? "bg-accent" : "hover:bg-accent/50"}`}>
              {c.title}
            </button>
          ))}
        </Card>

        <Card className="flex flex-col">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-scout-gradient text-primary-foreground"><Sparkles className="h-5 w-5" /></div>
                <div className="font-display text-lg">Pergunte qualquer coisa</div>
                <div className="text-sm">"O que vamos fazer no próximo acampamento?"</div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-scout-gradient text-primary-foreground" : "bg-accent"}`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              </div>
            ))}
            {sending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Pensando...</div>}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t p-3">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Faça uma pergunta..." disabled={sending} />
            <Button type="submit" size="icon" className="bg-scout-gradient" disabled={sending || !input.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
