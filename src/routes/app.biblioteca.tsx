import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Download, Trash2, Upload, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/biblioteca")({ component: Biblioteca });

type Doc = {
  id: string; title: string; description: string | null; category: string | null;
  file_path: string; file_name: string; file_size: number | null; mime_type: string | null;
  uploaded_by: string; created_at: string;
};

function Biblioteca() {
  const { isStaff, user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onDownload = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const onDelete = async (d: Doc) => {
    if (!confirm(`Apagar "${d.title}"?`)) return;
    await supabase.storage.from("documents").remove([d.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Documento removido");
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Biblioteca</h1>
          <p className="text-muted-foreground">Documentos do grupo</p>
        </div>
        {isStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-scout-gradient"><Upload className="mr-2 h-4 w-4" /> Enviar documento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo documento</DialogTitle></DialogHeader>
              <UploadForm userId={user!.id} onDone={() => { setOpen(false); load(); }} />
            </DialogContent>
          </Dialog>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : docs.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhum documento ainda.</Card>
      ) : (
        <div className="grid gap-3">
          {docs.map((d) => (
            <Card key={d.id} className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{d.title}</div>
                {d.description && <div className="text-sm text-muted-foreground truncate">{d.description}</div>}
                <div className="mt-1 text-xs text-muted-foreground">
                  {d.category && <span className="mr-2 rounded bg-accent px-1.5 py-0.5">{d.category}</span>}
                  {d.file_name}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onDownload(d)}><Download className="h-4 w-4" /></Button>
                {isStaff && <Button size="sm" variant="outline" onClick={() => onDelete(d)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("Selecione um arquivo");
    setSubmitting(true);
    const path = `${userId}/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("documents").upload(path, file);
    if (up.error) { setSubmitting(false); return toast.error(up.error.message); }
    const { error } = await supabase.from("documents").insert({
      title, description: description || null, category: category || null,
      file_path: path, file_name: file.name, file_size: file.size, mime_type: file.type,
      uploaded_by: userId,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Documento enviado");
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Título</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div><Label>Categoria</Label><Input placeholder="ex: Estatuto, Ficha, Programa" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
      <div><Label>Arquivo</Label><Input ref={fileRef} type="file" required /></div>
      <Button type="submit" className="w-full bg-scout-gradient" disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar
      </Button>
    </form>
  );
}
