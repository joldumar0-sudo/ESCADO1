import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Compass, Library, Camera, MessagesSquare, Sparkles, Tent } from "lucide-react";
import heroImg from "@/assets/hero-scouts.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Grupo Escoteiro — A trilha começa aqui" },
      { name: "description", content: "Plataforma do grupo escoteiro com documentos, galeria, chat em tempo real e assistente IA." },
    ],
  }),
});

const features = [
  { icon: Library, title: "Biblioteca", desc: "Estatutos, fichas e materiais sempre à mão." },
  { icon: Camera, title: "Galeria", desc: "Reviva acampamentos e atividades em fotos." },
  { icon: MessagesSquare, title: "Chat & DMs", desc: "Conversa do grupo e mensagens diretas." },
  { icon: Sparkles, title: "Assistente IA", desc: "Tire dúvidas sobre o conteúdo do grupo." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-hero-gradient">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-display text-xl font-bold">
          <Tent className="h-6 w-6 text-primary" />
          <span>Grupo Escoteiro</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost">Entrar</Button>
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-12 lg:grid-cols-2 lg:items-center lg:pt-20">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Compass className="h-3.5 w-3.5" /> Sempre Alerta
            </span>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              A trilha do grupo, <span className="text-gradient-scout">em um só lugar</span>.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Documentos, galeria, páginas informativas, chat em tempo real e um
              assistente IA treinado com o conteúdo do grupo. Tudo pensado para
              jovens, dirigentes e famílias.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg" className="bg-scout-gradient text-primary-foreground shadow-scout hover:opacity-95">
                  Entrar no grupo
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Criar minha conta
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-scout-gradient opacity-20 blur-3xl" />
            <img
              src={heroImg}
              alt="Escoteiros reunidos ao redor da fogueira"
              width={1536}
              height={1024}
              className="rounded-3xl shadow-scout ring-1 ring-border"
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t bg-card/40">
        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Grupo Escoteiro · Sempre Alerta
        </div>
      </footer>
    </div>
  );
}
