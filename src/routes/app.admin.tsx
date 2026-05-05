import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Shield, Search, Users, UserCog, Crown, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin")({ component: Admin });

type AppRole = "admin" | "dirigente" | "jovem" | "membro";
type Section = "lobinho" | "escoteiro" | "senior" | "pioneiro" | "dirigente" | "outro";

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

function initials(name: string | null, email: string | null) {
  const base = (name || email || "?").trim();
  return base.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

function Admin() {
  const { user, isAdmin, isStaff, loading } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | AppRole | "none">("all");

  useEffect(() => {
    if (!loading && !isStaff) navigate({ to: "/app" });
  }, [loading, isStaff, navigate]);

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
      ((profiles ?? []) as Array<Omit<Member, "roles">>).map((p) => ({
        ...p,
        roles: map[p.id] ?? [],
      }))
    );
    setBusy(false);
  };

  useEffect(() => {
    if (isStaff) load();
  }, [isStaff]);

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

  if (loading || busy) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display text-3xl font-bold">Painel de Administração</h1>
          </div>
          <p className="text-muted-foreground">
            {isAdmin ? "Gere membros, papéis e secções do grupo" : "Visualização de dirigente (somente leitura de papéis)"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="Membros" value={stats.total} />
        <StatCard icon={Crown} label="Admins" value={stats.admins} />
        <StatCard icon={UserCog} label="Dirigentes" value={stats.dirigentes} />
        <StatCard icon={Users} label="Jovens" value={stats.jovens} />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou secção…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterRole} onValueChange={(v) => setFilterRole(v as typeof filterRole)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filtrar por papel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os papéis</SelectItem>
              <SelectItem value="none">Sem papel</SelectItem>
              {ALL_ROLES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="divide-y">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">Nenhum membro encontrado.</div>
        )}
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
                  {m.roles.map((r) => (
                    <Badge key={r} className={roleStyle[r]}>{r}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={m.section} onValueChange={(v) => updateSection(m, v as Section)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1">
                  {ALL_ROLES.map((r) => {
                    const active = m.roles.includes(r);
                    return (
                      <Button
                        key={r}
                        size="sm"
                        variant={active ? "default" : "outline"}
                        className={active ? roleStyle[r] : ""}
                        onClick={() => toggleRole(m, r)}
                      >
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

      {!isAdmin && (
        <Card className="p-4 text-sm text-muted-foreground">
          Apenas administradores podem editar papéis e secções. Esta vista é apenas para consulta.
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}
