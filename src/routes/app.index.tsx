import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Library, Camera, BookOpen, MessagesSquare, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

const tiles = [
  { to: "/app/biblioteca", label: "Biblioteca", icon: Library, desc: "Documentos do grupo" },
  { to: "/app/galeria", label: "Galeria", icon: Camera, desc: "Fotos das atividades" },
  { to: "/app/informacoes", label: "Informações", icon: BookOpen, desc: "Páginas e regulamentos" },
  { to: "/app/chat", label: "Chat", icon: MessagesSquare, desc: "Conversa do grupo" },
  { to: "/app/assistente", label: "Assistente IA", icon: Sparkles, desc: "Tire dúvidas com IA" },
] as const;

function Dashboard() {
  const { user, roles } = useAuth();
  const [name, setName] = useState<string>("");
  const [counts, setCounts] = useState({ docs: 0, photos: 0, pages: 0 });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.full_name) setName(data.full_name.split(" ")[0]);
    });
    Promise.all([
      supabase.from("documents").select("*", { count: "exact", head: true }),
      supabase.from("gallery").select("*", { count: "exact", head: true }),
      supabase.from("info_pages").select("*", { count: "exact", head: true }),
    ]).then(([d, g, p]) => setCounts({ docs: d.count ?? 0, photos: g.count ?? 0, pages: p.count ?? 0 }));
  }, [user]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-wider text-muted-foreground">Sempre Alerta</p>
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          Olá, {name || "escoteiro"} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">Seu papel: {roles.join(", ") || "membro"}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Documentos" value={counts.docs} />
        <StatCard label="Fotos" value={counts.photos} />
        <StatCard label="Páginas" value={counts.pages} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ to, label, icon: Icon, desc }) => (
          <Link key={to} to={to}>
            <Card className="group h-full p-6 transition hover:-translate-y-1 hover:shadow-soft">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-scout-gradient group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-display text-lg font-semibold">{label}</div>
              <div className="text-sm text-muted-foreground">{desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-bold text-gradient-scout">{value}</div>
    </Card>
  );
}
