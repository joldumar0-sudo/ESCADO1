import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Shield, Search, Users, UserCog, Crown, RefreshCw, CalendarDays, ClipboardCheck, Trash2, Plus, FileText, Image as ImageIcon, MessageSquare, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin")({ component: Admin });

type AppRole = "admin" | "dirigente" | "jovem" | "membro";
type Section = "lobinho" | "escoteiro" | "senior" | "pioneiro" | "dirigente" | "outro";
type AttStatus = "presente" | "ausente" | "justificado";

const ALL_ROLES: AppRole[] = ["admin", "dirigente", "jovem", "membro"];
const ALL_SECTIONS: Section[] = ["lobinho", "escoteiro", "senior", "pioneiro", "dirigente", "outro"];

const roleStyle: Record<AppRole, string> = {
  admin: "bg-primary text-primary-foreground hover:bg-primary/90",
  dirigente: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  jovem: "bg-accent text-accent-foreground hover:bg-accent/90",
  membro: "bg-muted text-muted-foreground hover:bg-muted/80",
};

type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  section: Section;
  roles: AppRole[];
};

type Activity = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  sections: Section[];
  created_by: string;
};

function initials(name: string | null, email: string | null) {
  const base = (name || email || "?").trim();
  return base.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

function Admin() {
  const { isStaff, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isStaff) navigate({ to: "/app" });
  }, [loading, isStaff, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Painel de Administração</h1>
          <p className="text-sm text-muted-foreground">Gere membros, atividades, presenças e conteúdo.</p>
        </div>
      </header>

      <Tabs defaultValue="members">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="members"><Users className="mr-2 h-4 w-4" />Membros</TabsTrigger>
          <TabsTrigger value="activities"><CalendarDays className="mr-2 h-4 w-4" />Atividades</TabsTrigger>
          <TabsTrigger value="attendance"><ClipboardCheck className="mr-2 h-4 w-4" />Presenças</TabsTrigger>
          <TabsTrigger value="content"><FileText className="mr-2 h-4 w-4" />Conteúdo</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-4"><MembersTab /></TabsContent>
        <TabsContent value="activities" className="mt-4"><ActivitiesTab /></TabsContent>
        <TabsContent value="attendance" className="mt-4"><AttendanceTab /></TabsContent>
        <TabsContent value="content" className="mt-4"><ContentTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================== MEMBERS ============================== */
function MembersTab() {
  const { user, isAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | AppRole | "none">("all");

  const load = async () => {
    setBusy(true);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.rpc("get_members_with_email"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    if (pErr || rErr) {
      toast.error(pErr?.message || rErr?.message || "Erro ao carregar");
      setBusy(false);
      return;
    }
    const map: Record<string, AppRole[]> = {};
    (roles ?? []).forEach((r: { user_id: string; role: AppRole }) => {
      (map[r.user_id] ??= []).push(r.role);
    });
    setMembers(
      ((profiles ?? []) as Array<Omit<Member, "roles">>).map((p) => ({ ...p, roles: map[p.id] ?? [] }))
    );
    setBusy(false);
  };

  useEffect(() => { load(); }, []);

  const toggleRole = async (m: Member, role: AppRole) => {
    if (!isAdmin) return toast.error("Apenas administradores gerem papéis");
    if (m.id === user?.id && role === "admin" && m.roles.includes("admin")) {
      return toast.error("Não pode remover o seu próprio papel de admin");
    }
    const has = m.roles.includes(role);
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", m.id).eq("role", role);
      if (error) return toast.error(error.message);
      toast.success(`Removido: ${role}`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: m.id, role });
      if (error) return toast.error(error.message);
      toast.success(`Atribuído: ${role}`);
    }
    load();
  };

  const updateSection = async (m: Member, section: Section) => {
    if (!isAdmin) return;
    const { error } = await supabase.from("profiles").update({ section }).eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Secção atualizada");
    load();
  };

  const stats = useMemo(() => {
    const total = members.length;
    const admins = members.filter((m) => m.roles.includes("admin")).length;
    const dirigentes = members.filter((m) => m.roles.includes("dirigente")).length;
    const jovens = members.filter((m) => m.roles.includes("jovem")).length;
    return { total, admins, dirigentes, jovens };
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (filterRole === "none" && m.roles.length > 0) return false;
      if (filterRole !== "all" && filterRole !== "none" && !m.roles.includes(filterRole)) return false;
      if (!q) return true;
      return (
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.section.toLowerCase().includes(q)
      );
    });
  }, [members, query, filterRole]);

  if (busy) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="Membros" value={stats.total} />
        <StatCard icon={Crown} label="Admins" value={stats.admins} />
        <StatCard icon={UserCog} label="Dirigentes" value={stats.dirigentes} />
        <StatCard icon={Users} label="Jovens" value={stats.jovens} />
      </div>

      <Card className="border-primary/30 bg-primary/5 p-4 text-sm">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <Shield className="h-4 w-4 text-primary" /> Quem pode publicar conteúdo?
        </div>
        <ul className="space-y-1 text-muted-foreground">
          <li className="flex flex-wrap items-center gap-2"><Badge className={roleStyle.admin}>admin</Badge> Acesso total — gere membros e publica em todas as áreas.</li>
          <li className="flex flex-wrap items-center gap-2"><Badge className={roleStyle.dirigente}>dirigente</Badge> Pode adicionar conteúdo e marcar presenças.</li>
          <li className="flex flex-wrap items-center gap-2"><Badge className={roleStyle.jovem}>jovem</Badge><Badge className={roleStyle.membro}>membro</Badge> Apenas leitura e chat.</li>
        </ul>
      </Card>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Pesquisar por nome, email ou secção…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
          </div>
          <Select value={filterRole} onValueChange={(v) => setFilterRole(v as typeof filterRole)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por papel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os papéis</SelectItem>
              <SelectItem value="none">Sem papel</SelectItem>
              {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
        </div>
      </Card>

      <Card className="divide-y">
        {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum membro encontrado.</div>}
        {filtered.map((m) => (
          <div key={m.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-10 w-10">
                {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.full_name ?? ""} />}
                <AvatarFallback>{initials(m.full_name, m.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{m.full_name ?? m.email ?? "Sem nome"}</span>
                  {m.id === user?.id && <Badge variant="outline" className="text-[10px]">você</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.roles.length === 0 && <Badge variant="outline">sem papel</Badge>}
                  {m.roles.map((r) => <Badge key={r} className={roleStyle[r]}>{r}</Badge>)}
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={m.section} onValueChange={(v) => updateSection(m, v as Section)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1">
                  {ALL_ROLES.map((r) => {
                    const active = m.roles.includes(r);
                    return (
                      <Button key={r} size="sm" variant={active ? "default" : "outline"} className={active ? roleStyle[r] : ""} onClick={() => toggleRole(m, r)}>
                        {active ? "✓ " : "+ "}{r}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ============================== ACTIVITIES ============================== */
function ActivitiesTab() {
  const { user } = useAuth();
  const [list, setList] = useState<Activity[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase.from("activities").select("*").order("starts_at", { ascending: false });
    if (error) toast.error(error.message);
    setList((data ?? []) as Activity[]);
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atividade eliminada");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Atividades</h2>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nova atividade</Button>
      </div>

      {busy ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Sem atividades. Crie a primeira!</Card>
      ) : (
        <Card className="divide-y">
          {list.map((a) => (
            <div key={a.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(a.starts_at).toLocaleString("pt-PT")}
                  {a.location && ` • ${a.location}`}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {a.sections.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                </div>
                {a.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.description}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="mr-1 h-3 w-3" />Editar</Button>
                <ConfirmDelete label="Eliminar atividade?" onConfirm={() => remove(a.id)} />
              </div>
            </div>
          ))}
        </Card>
      )}

      <ActivityDialog
        open={open}
        onOpenChange={setOpen}
        activity={editing}
        userId={user?.id ?? ""}
        onSaved={load}
      />
    </div>
  );
}

function ActivityDialog({ open, onOpenChange, activity, userId, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; activity: Activity | null; userId: string; onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(activity?.title ?? "");
      setDescription(activity?.description ?? "");
      setLocation(activity?.location ?? "");
      setStartsAt(activity?.starts_at ? activity.starts_at.slice(0, 16) : "");
      setSections(activity?.sections ?? []);
    }
  }, [open, activity]);

  const toggleSection = (s: Section) => {
    setSections((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const save = async () => {
    if (!title.trim() || !startsAt) return toast.error("Título e data são obrigatórios");
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      starts_at: new Date(startsAt).toISOString(),
      sections,
    };
    const { error } = activity
      ? await supabase.from("activities").update(payload).eq("id", activity.id)
      : await supabase.from("activities").insert({ ...payload, created_by: userId });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(activity ? "Atualizada" : "Criada");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{activity ? "Editar atividade" : "Nova atividade"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Título *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reunião semanal" />
          </div>
          <div>
            <label className="text-sm font-medium">Data e hora *</label>
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Local</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Sede" />
          </div>
          <div>
            <label className="text-sm font-medium">Secções</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {ALL_SECTIONS.map((s) => (
                <Button key={s} type="button" size="sm" variant={sections.includes(s) ? "default" : "outline"} onClick={() => toggleSection(s)}>{s}</Button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================== ATTENDANCE ============================== */
function AttendanceTab() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activityId, setActivityId] = useState<string>("");
  const [att, setAtt] = useState<Record<string, AttStatus>>({});
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      setBusy(true);
      const [{ data: acts }, { data: profs }] = await Promise.all([
        supabase.from("activities").select("*").order("starts_at", { ascending: false }),
        supabase.rpc("get_members_with_email"),
      ]);
      setActivities((acts ?? []) as Activity[]);
      setMembers(((profs ?? []) as Array<Omit<Member, "roles">>).map((p) => ({ ...p, roles: [] })));
      setBusy(false);
    })();
  }, []);

  useEffect(() => {
    if (!activityId) { setAtt({}); return; }
    (async () => {
      const { data } = await supabase.from("activity_attendance").select("user_id,status").eq("activity_id", activityId);
      const map: Record<string, AttStatus> = {};
      (data ?? []).forEach((r) => { map[r.user_id] = r.status as AttStatus; });
      setAtt(map);
    })();
  }, [activityId]);

  const setStatus = async (uid: string, status: AttStatus) => {
    if (!activityId || !user) return;
    setAtt((p) => ({ ...p, [uid]: status }));
    const { error } = await supabase
      .from("activity_attendance")
      .upsert(
        { activity_id: activityId, user_id: uid, status, marked_by: user.id },
        { onConflict: "activity_id,user_id" }
      );
    if (error) toast.error(error.message);
  };

  const filteredMembers = useMemo(() => {
    const a = activities.find((x) => x.id === activityId);
    if (!a || a.sections.length === 0) return members;
    return members.filter((m) => a.sections.includes(m.section));
  }, [activityId, activities, members]);

  const counts = useMemo(() => {
    const presentes = Object.values(att).filter((s) => s === "presente").length;
    const ausentes = Object.values(att).filter((s) => s === "ausente").length;
    const just = Object.values(att).filter((s) => s === "justificado").length;
    return { presentes, ausentes, just };
  }, [att]);

  if (busy) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium">Selecionar atividade</label>
        <Select value={activityId} onValueChange={setActivityId}>
          <SelectTrigger><SelectValue placeholder="Escolha uma atividade…" /></SelectTrigger>
          <SelectContent>
            {activities.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.title} — {new Date(a.starts_at).toLocaleDateString("pt-PT")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activityId && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge className="bg-green-600 text-white">Presentes: {counts.presentes}</Badge>
            <Badge variant="destructive">Ausentes: {counts.ausentes}</Badge>
            <Badge variant="secondary">Justificados: {counts.just}</Badge>
          </div>
        )}
      </Card>

      {activityId && (
        <Card className="divide-y">
          {filteredMembers.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sem membros para esta atividade.</div>}
          {filteredMembers.map((m) => {
            const s = att[m.id];
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                    <AvatarFallback>{initials(m.full_name, m.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.full_name ?? m.email}</div>
                    <div className="text-xs text-muted-foreground">{m.section}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant={s === "presente" ? "default" : "outline"} className={s === "presente" ? "bg-green-600 hover:bg-green-700 text-white" : ""} onClick={() => setStatus(m.id, "presente")}>P</Button>
                  <Button size="sm" variant={s === "ausente" ? "destructive" : "outline"} onClick={() => setStatus(m.id, "ausente")}>A</Button>
                  <Button size="sm" variant={s === "justificado" ? "secondary" : "outline"} onClick={() => setStatus(m.id, "justificado")}>J</Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

/* ============================== CONTENT ============================== */
function ContentTab() {
  type Doc = { id: string; title: string; file_name: string; created_at: string };
  type Photo = { id: string; title: string | null; image_path: string; created_at: string };
  type Msg = { id: string; content: string; user_id: string; created_at: string };
  const [docs, setDocs] = useState<Doc[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    const [d, g, c] = await Promise.all([
      supabase.from("documents").select("id,title,file_name,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("gallery").select("id,title,image_path,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("chat_messages").select("id,content,user_id,created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    setDocs((d.data ?? []) as Doc[]);
    setPhotos((g.data ?? []) as Photo[]);
    setMsgs((c.data ?? []) as Msg[]);
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const del = async (table: "documents" | "gallery" | "chat_messages", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    load();
  };

  if (busy) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Tabs defaultValue="docs">
      <TabsList>
        <TabsTrigger value="docs"><FileText className="mr-2 h-4 w-4" />Documentos ({docs.length})</TabsTrigger>
        <TabsTrigger value="photos"><ImageIcon className="mr-2 h-4 w-4" />Fotos ({photos.length})</TabsTrigger>
        <TabsTrigger value="chat"><MessageSquare className="mr-2 h-4 w-4" />Chat ({msgs.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="docs" className="mt-3">
        <Card className="divide-y">
          {docs.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sem documentos.</div>}
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{d.title}</div>
                <div className="text-xs text-muted-foreground truncate">{d.file_name} • {new Date(d.created_at).toLocaleDateString("pt-PT")}</div>
              </div>
              <ConfirmDelete label="Eliminar documento?" onConfirm={() => del("documents", d.id)} />
            </div>
          ))}
        </Card>
      </TabsContent>

      <TabsContent value="photos" className="mt-3">
        <Card className="divide-y">
          {photos.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sem fotos.</div>}
          {photos.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{p.title ?? "(sem título)"}</div>
                <div className="text-xs text-muted-foreground truncate">{new Date(p.created_at).toLocaleDateString("pt-PT")}</div>
              </div>
              <ConfirmDelete label="Eliminar foto?" onConfirm={() => del("gallery", p.id)} />
            </div>
          ))}
        </Card>
      </TabsContent>

      <TabsContent value="chat" className="mt-3">
        <Card className="divide-y">
          {msgs.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sem mensagens.</div>}
          {msgs.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="text-sm truncate">{m.content}</div>
                <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-PT")}</div>
              </div>
              <ConfirmDelete label="Eliminar mensagem?" onConfirm={() => del("chat_messages", m.id)} />
            </div>
          ))}
        </Card>
      </TabsContent>
    </Tabs>
  );
}

/* ============================== SHARED ============================== */
function ConfirmDelete({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}</AlertDialogTitle>
          <AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}
