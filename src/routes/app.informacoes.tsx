import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/informacoes")({ component: Informacoes });

type Page = { id: string; title: string; category: string | null; content: string; cover_image: string | null; author_id: string; updated_at: string };

function Informacoes() {
  const { isStaff, user } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Page | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Page | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("info_pages").select("*").order("updated_at", { ascending: false });
    setPages((data ?? []) as Page[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (p: Page) => {
    if (!confirm(`Apagar "${p.title}"?`)) return;
    const { error } = await supabase.from("info_pages").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Página removida"); setActive(null); load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Informações</h1>
          <p className="text-muted-foreground">Páginas do grupo</p>
        </div>
        {isStaff && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button className="bg-scout-gradient"><Plus className="mr-2 h-4 w-4" /> Nova página</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Editar página" : "Nova página"}</DialogTitle></DialogHeader>
              <PageForm userId={user!.id} page={editing} onDone={() => { setOpen(false); setEditing(null); load(); }} />
            </DialogContent>
          </Dialog>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : active ? (
        <Card className="p-6">
          <Button variant="ghost" size="sm" onClick={() => setActive(null)} className="mb-4">← Voltar</Button>
          <h2 className="font-display text-2xl font-bold">{active.title}</h2>
          {active.category && <div className="mt-1 text-xs uppercase tracking-wider text-primary">{active.category}</div>}
          <div className="prose prose-sm mt-6 max-w-none dark:prose-invert">
            <ReactMarkdown>{active.content}</ReactMarkdown>
          </div>
          {isStaff && (
            <div className="mt-6 flex gap-2 border-t pt-4">
              <Button size="sm" variant="outline" onClick={() => { setEditing(active); setOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>
              <Button size="sm" variant="outline" onClick={() => onDelete(active)}><Trash2 className="mr-2 h-4 w-4" /> Apagar</Button>
            </div>
          )}
        </Card>
      ) : pages.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhuma página ainda.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p) => (
            <Card key={p.id} className="cursor-pointer p-5 transition hover:-translate-y-1 hover:shadow-soft" onClick={() => setActive(p)}>
              {p.category && <div className="text-xs uppercase tracking-wider text-primary">{p.category}</div>}
              <div className="mt-1 font-display text-lg font-semibold">{p.title}</div>
              <div className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.content.slice(0, 160)}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PageForm({ userId, page, onDone }: { userId: string; page: Page | null; onDone: () => void }) {
  const [title, setTitle] = useState(page?.title ?? "");
  const [category, setCategory] = useState(page?.category ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = { title, category: category || null, content, author_id: userId };
    const { error } = page
      ? await supabase.from("info_pages").update(payload).eq("id", page.id)
      : await supabase.from("info_pages").insert(payload);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Título</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><Label>Categoria</Label><Input placeholder="ex: Regulamento, História, FAQ" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
      <div><Label>Conteúdo (Markdown)</Label><Textarea required rows={12} value={content} onChange={(e) => setContent(e.target.value)} /></div>
      <Button type="submit" className="w-full bg-scout-gradient" disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
      </Button>
    </form>
  );
}
