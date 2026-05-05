import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Library, Camera, BookOpen, MessagesSquare, Sparkles, ArrowRight, Compass } from "lucide-react";
import heroImg from "@/assets/hero-scouts.jpg";

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
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border shadow-soft">
        <img
          src={heroImg}
          alt="Grupo de escoteiros"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/70 to-primary/40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.35),_transparent_60%)]" />
        <div className="relative p-6 md:p-10">
          <Badge variant="outline" className="mb-4 border-primary/40 bg-background/60 backdrop-blur">
            <Compass className="mr-1 h-3 w-3" /> Sempre Alerta
          </Badge>
          <h1 className="font-display text-3xl font-bold leading-tight md:text-5xl">
            Olá, <span className="text-gradient-scout">{name || "escoteiro"}</span> 👋
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground md:text-lg">
            Bem-vindo ao espaço do grupo. Aceda a documentos, fotos, conversas e ao assistente IA.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(roles.length ? roles : ["membro"]).map((r) => (
              <Badge key={r} className="bg-primary/15 text-primary hover:bg-primary/20">{r}</Badge>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/app/chat"
              className="inline-flex items-center gap-2 rounded-xl bg-scout-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:-translate-y-0.5"
            >
              Abrir chat <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/app/assistente"
              className="inline-flex items-center gap-2 rounded-xl border bg-background/70 px-5 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-background"
            >
              <Sparkles className="h-4 w-4" /> Assistente IA
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Documentos" value={counts.docs} icon={Library} />
        <StatCard label="Fotos" value={counts.photos} icon={Camera} />
        <StatCard label="Páginas" value={counts.pages} icon={BookOpen} />
      </div>

      {/* Tiles */}
      <div>
        <h2 className="mb-4 font-display text-xl font-semibold">Explorar</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map(({ to, label, icon: Icon, desc }) => (
            <Link key={to} to={to}>
              <Card className="group relative h-full overflow-hidden p-6 transition hover:-translate-y-1 hover:shadow-soft">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 transition group-hover:bg-primary/15" />
                <div className="relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-scout-gradient group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-display text-lg font-semibold">{label}</div>
                <div className="text-sm text-muted-foreground">{desc}</div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
                  Abrir <ArrowRight className="h-3 w-3" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Library }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-primary/5" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="font-display text-3xl font-bold text-gradient-scout">{value}</div>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}
