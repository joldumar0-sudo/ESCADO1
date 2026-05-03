import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/chat")({ component: Chat });

type Profile = { id: string; full_name: string | null; email: string | null };
type Msg = { id: string; user_id: string; content: string; created_at: string };
type DM = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string; read_at: string | null };

function Chat() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Chat</h1>
        <p className="text-muted-foreground">Converse com o grupo ou em particular</p>
      </header>
      <Tabs defaultValue="general">
        <TabsList><TabsTrigger value="general">Geral</TabsTrigger><TabsTrigger value="dm">Mensagens diretas</TabsTrigger></TabsList>
        <TabsContent value="general"><GeneralChat /></TabsContent>
        <TabsContent value="dm"><DirectMessages /></TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("chat_messages").select("*").order("created_at").limit(200).then(({ data }) => {
      setMessages((data ?? []) as Msg[]);
    });
    supabase.from("profiles").select("id,full_name,email").then(({ data }) => {
      const map: Record<string, Profile> = {};
      (data ?? []).forEach((p) => (map[p.id] = p as Profile));
      setProfiles(map);
    });

    const channel = supabase
      .channel("chat-general")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        setMessages((m) => [...m, payload.new as Msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const c = text.trim(); setText("");
    const { error } = await supabase.from("chat_messages").insert({ user_id: user.id, content: c });
    if (error) toast.error(error.message);
  };

  return (
    <Card className="flex h-[60vh] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.user_id === user?.id;
          const name = profiles[m.user_id]?.full_name ?? profiles[m.user_id]?.email ?? "Escoteiro";
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && <Avatar className="h-8 w-8"><AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback></Avatar>}
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? "bg-scout-gradient text-primary-foreground" : "bg-accent"}`}>
                {!mine && <div className="text-xs font-semibold opacity-70">{name}</div>}
                <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mensagem..." />
        <Button type="submit" size="icon" className="bg-scout-gradient"><Send className="h-4 w-4" /></Button>
      </form>
    </Card>
  );
}

function DirectMessages() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [active, setActive] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("profiles").select("id,full_name,email").then(({ data }) => {
      setMembers(((data ?? []) as Profile[]).filter((p) => p.id !== user?.id));
    });
  }, [user]);

  useEffect(() => {
    if (!active || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${active.id}),and(sender_id.eq.${active.id},recipient_id.eq.${user.id})`)
        .order("created_at");
      setMessages((data ?? []) as DM[]);
    };
    load();
    const channel = supabase
      .channel(`dm-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const m = payload.new as DM;
        if ((m.sender_id === user.id && m.recipient_id === active.id) || (m.sender_id === active.id && m.recipient_id === user.id)) {
          setMessages((prev) => [...prev, m]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active, user]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !active) return;
    const c = text.trim(); setText("");
    await supabase.from("direct_messages").insert({ sender_id: user.id, recipient_id: active.id, content: c });
  };

  return (
    <div className="grid h-[60vh] gap-4 md:grid-cols-[260px_1fr]">
      <Card className="overflow-y-auto p-2">
        {members.map((m) => (
          <button key={m.id} onClick={() => setActive(m)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${active?.id === m.id ? "bg-accent" : "hover:bg-accent/50"}`}>
            <Avatar className="h-8 w-8"><AvatarFallback>{(m.full_name ?? m.email ?? "?")[0]?.toUpperCase()}</AvatarFallback></Avatar>
            <div className="min-w-0 text-sm">
              <div className="truncate font-medium">{m.full_name ?? m.email}</div>
            </div>
          </button>
        ))}
        {members.length === 0 && <div className="p-4 text-sm text-muted-foreground">Sem outros membros.</div>}
      </Card>
      <Card className="flex flex-col">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Selecione alguém para conversar</div>
        ) : (
          <>
            <div className="border-b px-4 py-3 font-semibold">{active.full_name ?? active.email}</div>
            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-scout-gradient text-primary-foreground" : "bg-accent"}`}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="flex gap-2 border-t p-3">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mensagem..." />
              <Button type="submit" size="icon" className="bg-scout-gradient"><Send className="h-4 w-4" /></Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
