import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-gradient px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-gradient-scout">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A trilha que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition hover:bg-primary/90"
          >
            Voltar para o acampamento
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ESCOTEIROS CATÓLICOS DO DONDO" },
      { name: "description", content: "Procurai deixar o mundo um pouco melhor do que o encontraste 
Aqui você encontra tudo sobre o grupo 
De Oldumar Júlio pra escoteiros" },
      { property: "og:title", content: "ESCOTEIROS CATÓLICOS DO DONDO" },
      { name: "twitter:title", content: "ESCOTEIROS CATÓLICOS DO DONDO" },
      { property: "og:description", content: "Procurai deixar o mundo um pouco melhor do que o encontraste 
Aqui você encontra tudo sobre o grupo 
De Oldumar Júlio pra escoteiros" },
      { name: "twitter:description", content: "Procurai deixar o mundo um pouco melhor do que o encontraste 
Aqui você encontra tudo sobre o grupo 
De Oldumar Júlio pra escoteiros" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/027eff00-fd4b-4aa5-83dc-048399048ea7" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/027eff00-fd4b-4aa5-83dc-048399048ea7" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Toaster richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}
