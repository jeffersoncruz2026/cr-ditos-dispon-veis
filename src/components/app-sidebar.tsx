import { Link, useRouterState } from "@tanstack/react-router";
import { PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { navGroups } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Marca SolarGest: sol estilizado em quadro azul-marinho com detalhe solar. */
export function LogoSolarGest({ className }: { className?: string | undefined }) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.546_0.215_262.9)] to-[oklch(0.42_0.17_262)] text-white ring-1 ring-white/15",
        className ?? "h-9 w-9",
      )}
      aria-hidden
    >
      <Sun className="h-[18px] w-[18px]" strokeWidth={2.25} />
      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-solar ring-2 ring-sidebar" />
    </div>
  );
}

export function AppSidebar() {
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className={cn("pb-3 pt-4", collapsed ? "px-2" : "px-3")}>
        <Link
          to="/dashboard"
          onClick={() => isMobile && setOpenMobile(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg py-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            collapsed ? "justify-center px-0" : "px-1",
          )}
        >
          <LogoSolarGest className={collapsed ? "h-8 w-8" : undefined} />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-bold tracking-tight text-sidebar-accent-foreground">
                Solar<span className="text-sidebar-primary">Gest</span>
              </p>
              <p className="truncate text-[11px] font-medium text-sidebar-foreground/55">
                Gestão de energia solar
              </p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <div className={cn("h-px bg-sidebar-border", collapsed ? "mx-2" : "mx-3")} aria-hidden />

      <SidebarContent className="gap-0 px-1 py-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="h-7 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/40">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active = path === item.url || path.startsWith(`${item.url}/`);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="h-9 rounded-lg text-[13.5px] font-medium text-sidebar-foreground/75 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary/[0.16] data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground"
                      >
                        <Link to={item.url} onClick={() => isMobile && setOpenMobile(false)}>
                          <item.icon
                            className={cn(
                              "transition-colors",
                              active ? "text-sidebar-primary" : "text-sidebar-foreground/55",
                            )}
                          />
                          <span>{item.title}</span>
                          {active && !collapsed && (
                            <span
                              className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary"
                              aria-hidden
                            />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-2 p-3">
        {!collapsed && (
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              Concessionária
            </p>
            <p className="mt-0.5 text-[13px] font-semibold text-sidebar-accent-foreground">
              Equatorial Goiás
            </p>
            <p className="mt-0.5 text-[11px] text-sidebar-foreground/55">
              Sistema de compensação (SCEE)
            </p>
          </div>
        )}
        {!isMobile && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleSidebar}
                tooltip={collapsed ? "Expandir menu" : "Recolher menu"}
                className="h-9 rounded-lg text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                <span>Recolher menu</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
