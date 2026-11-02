import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronRight, LogOut, Settings, ShieldCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { findNav } from "@/lib/nav";
import { capitalizar } from "@/lib/format";
import { roleLabels, type AppRole } from "@/hooks/use-access";

export function AppHeader({ user, role }: { user: User; role: AppRole | undefined }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const current = findNav(path);
  const email = user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();
  const hoje = capitalizar(
    new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl md:px-8">
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-5" />
      <nav aria-label="Navegação estrutural" className="flex min-w-0 items-center gap-1.5 text-sm">
        {current && (
          <>
            <span className="hidden text-muted-foreground sm:inline">{current.group}</span>
            <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground/60 sm:inline" />
            <span className="truncate font-semibold text-foreground">{current.item.title}</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground lg:inline">{hoje}</span>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full p-0.5 pr-1 outline-none ring-ring transition hover:bg-muted focus-visible:ring-2 md:pr-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left leading-tight md:block">
              <p className="max-w-[180px] truncate text-sm font-semibold">{email}</p>
              <p className="text-xs text-muted-foreground">
                {role ? roleLabels[role] : "Acesso pendente"}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold">{email}</p>
              {role && (
                <Badge variant="secondary" className="mt-1.5 gap-1">
                  <ShieldCheck className="h-3 w-3" /> {roleLabels[role]}
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/configuracoes" })}>
              <Settings className="h-4 w-4" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut className="h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
