import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin")({ component: Admin });

type AppRole = "admin" | "dirigente" | "jovem" | "membro";
type Member = { id: string; full_name: string | null; email: string | null; section: string; roles: AppRole[] };

function Admin() {
  const { isAdmin, isStaff, loading } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !isStaff) navigate({ to: "/app" });
  }, [loading, isStaff, navigate]);

  const load = async () => {
    setBusy(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,section"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const map: Record<string, AppRole[]> = {};
    (roles ?? []).forEach((r) => { (map[r.user_id] ??= []).push(r.role as AppRole); });
    setMembers(((profiles ?? []) as Array<{id:string;full_name:string|null;email:string|null;section:string}>).map((p) => ({ ...p, roles: map[p.id] ?? [] })));
    setBusy(false);
  };
  useEffect(() => { if (isStaff) load(); }, [isStaff]);

  const setRole = async (userId: string, role: AppRole) => {
    if (!isAdmin) return toast.error("Apenas admins gerenciam papéis");
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) return toast.error(delErr.message);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success("Papel atualizado");
    load();
  };

  if (loading || busy) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-bold">Painel</h1>
        </div>
        <p className="text-muted-foreground">{isAdmin ? "Gerencie papéis dos membros" : "Visualização de dirigente"}</p>
      </header>

      <Card className="divide-y">
        {members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="font-medium truncate">{m.full_name ?? m.email}</div>
              <div className="text-xs text-muted-foreground truncate">{m.email}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {m.roles.length === 0 && <Badge variant="outline">sem papel</Badge>}
                {m.roles.map((r) => (
                  <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                ))}
              </div>
            </div>
            {isAdmin && (
              <Select onValueChange={(v) => setRole(m.id, v as AppRole)} value={m.roles[0] ?? ""}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Definir papel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="dirigente">dirigente</SelectItem>
                  <SelectItem value="jovem">jovem</SelectItem>
                  <SelectItem value="membro">membro</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </Card>

      {!isAdmin && (
        <Card className="p-4 text-sm text-muted-foreground">
          Para promover um usuário a admin pela primeira vez, abra o Backend e edite a tabela <code>user_roles</code>.
        </Card>
      )}
    </div>
  );
}
