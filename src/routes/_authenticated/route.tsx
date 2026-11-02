import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/hooks/use-access";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  const access = useAccess(user.id);

  if (access.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </div>
    );
  }

  if (!access.authorized) return <AcessoPendente email={user.email ?? ""} erro={access.isError} />;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <AppHeader user={user} role={access.primaryRole} />
        <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AcessoPendente({ email, erro }: { email: string; erro: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-card">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/15 text-warning-foreground">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">
          {erro ? "Não foi possível verificar seu acesso" : "Acesso aguardando autorização"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {erro ? (
            "Ocorreu um erro ao consultar suas permissões. Tente novamente em instantes."
          ) : (
            <>
              A conta <strong className="text-foreground">{email}</strong> foi criada, mas ainda não
              possui permissão para acessar os dados do SolarGest. Solicite a liberação a um
              administrador.
            </>
          )}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Verificar novamente
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
