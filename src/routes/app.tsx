import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tent, LayoutDashboard, Library, Camera, BookOpen, MessagesSquare, Sparkles, Shield, LogOut, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

type NavItem = { to: "/app" | "/app/biblioteca" | "/app/galeria" | "/app/informacoes" | "/app/chat" | "/app/assistente" | "/app/definicoes"; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/app", label: "Início", icon: LayoutDashboard, exact: true },
  { to: "/app/biblioteca", label: "Biblioteca", icon: Library },
  { to: "/app/galeria", label: "Galeria", icon: Camera },
  { to: "/app/informacoes", label: "Informações", icon: BookOpen },
  { to: "/app/chat", label: "Chat", icon: MessagesSquare },
  { to: "/app/assistente", label: "Assistente", icon: Sparkles },
  { to: "/app/definicoes", label: "Definições", icon: Settings },
];

function AppShell() {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-6 py-6 font-display text-lg font-bold">
          <Tent className="h-5 w-5 text-secondary" />
          Grupo Escoteiro
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
          {isStaff && (
            <Link
              to="/app/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                location.pathname.startsWith("/app/admin")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Shield className="h-4 w-4" /> Painel
            </Link>
          )}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 px-2 text-xs text-sidebar-foreground/60 truncate">{user.email}</div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b bg-sidebar px-4 py-3 text-sidebar-foreground">
        <Link to="/app" className="flex items-center gap-2 font-display font-bold">
          <Tent className="h-5 w-5 text-secondary" /> Grupo Escoteiro
        </Link>
        <Button size="sm" variant="ghost" onClick={onLogout}><LogOut className="h-4 w-4" /></Button>
      </div>

      <main className="flex-1 overflow-x-hidden pt-14 md:pt-0">
        <div className="mx-auto max-w-6xl p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </div>
        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-card py-2">
          {nav.slice(0, 5).map((item) => {
            const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={cn("flex flex-col items-center gap-0.5 px-3 py-1 text-xs", active ? "text-primary" : "text-muted-foreground")}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
