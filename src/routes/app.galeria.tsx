import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/galeria")({ component: Galeria });

type Photo = { id: string; title: string | null; description: string | null; event_name: string | null; image_path: string; created_at: string };

function Galeria() {
  const { isStaff, user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("gallery").select("*").order("created_at", { ascending: false });
    setPhotos((data ?? []) as Photo[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const url = (path: string) => supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;

  const onDelete = async (p: Photo) => {
    if (!confirm("Apagar foto?")) return;
    await supabase.storage.from("gallery").remove([p.image_path]);
    const { error } = await supabase.from("gallery").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Foto removida"); load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Galeria</h1>
          <p className="text-muted-foreground">Fotos das atividades</p>
        </div>
        {isStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-scout-gradient"><Upload className="mr-2 h-4 w-4" /> Enviar foto</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova foto</DialogTitle></DialogHeader>
              <PhotoForm userId={user!.id} onDone={() => { setOpen(false); load(); }} />
            </DialogContent>
          </Dialog>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : photos.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhuma foto ainda.</Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-xl border bg-card">
              <img src={url(p.image_path)} alt={p.title ?? ""} loading="lazy" className="aspect-square w-full object-cover transition group-hover:scale-105" />
              {(p.title || p.event_name) && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                  {p.title && <div className="text-sm font-semibold truncate">{p.title}</div>}
                  {p.event_name && <div className="text-xs opacity-80 truncate">{p.event_name}</div>}
                </div>
              )}
              {isStaff && (
                <Button size="icon" variant="destructive" className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => onDelete(p)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [event, setEvent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("Selecione uma imagem");
    setSubmitting(true);
    const path = `${userId}/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("gallery").upload(path, file);
    if (up.error) { setSubmitting(false); return toast.error(up.error.message); }
    const { error } = await supabase.from("gallery").insert({
      title: title || null, event_name: event || null, image_path: path, uploaded_by: userId,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Foto enviada"); onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><Label>Evento</Label><Input value={event} onChange={(e) => setEvent(e.target.value)} /></div>
      <div><Label>Imagem</Label><Input ref={fileRef} type="file" accept="image/*" required /></div>
      <Button type="submit" className="w-full bg-scout-gradient" disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar
      </Button>
    </form>
  );
}
