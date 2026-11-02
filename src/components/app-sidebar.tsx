import { Link, useRouterState } from "@tanstack/react-router";
import { Sun } from "lucide-react";
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

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 pb-2 pt-4">
        <Link to="/dashboard" className="flex items-center gap-3 rounded-lg px-1 py-1">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-lg shadow-black/20 ring-1 ring-white/15">
            <Sun className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-extrabold tracking-tight text-sidebar-accent-foreground">
                Solar<span className="text-sidebar-primary">Gest</span>
              </p>
              <p className="truncate text-[11px] font-medium text-sidebar-foreground/60">
                Gestão Inteligente de Energia
              </p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-1">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
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
                        className="h-9 rounded-lg font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary/15 data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                      >
                        <Link to={item.url} onClick={() => isMobile && setOpenMobile(false)}>
                          <item.icon className={active ? "text-sidebar-primary" : ""} />
                          <span>{item.title}</span>
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

      <SidebarFooter className="p-3">
        {!collapsed ? (
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Concessionária
            </p>
            <p className="mt-0.5 text-sm font-semibold text-sidebar-accent-foreground">
              Equatorial Energia Goiás
            </p>
            <p className="mt-1 text-xs text-sidebar-foreground/60">
              Sistema de compensação de energia elétrica
            </p>
          </div>
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
