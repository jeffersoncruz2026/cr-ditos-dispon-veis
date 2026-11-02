import {
  LayoutDashboard,
  Home,
  FileUp,
  CalendarCheck,
  Sun,
  Wallet,
  Share2,
  Calculator,
  LineChart,
  FileText,
  Sparkles,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = { title: string; url: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "Visão geral",
    items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operação",
    items: [
      { title: "Unidades Consumidoras", url: "/unidades", icon: Home },
      { title: "Importar Faturas", url: "/importar-faturas", icon: FileUp },
      { title: "Fechamento Mensal", url: "/fechamento", icon: CalendarCheck },
    ],
  },
  {
    label: "Energia",
    items: [
      { title: "Geração Solar", url: "/geracao", icon: Sun },
      { title: "Gestão de Créditos", url: "/creditos", icon: Wallet },
      { title: "Distribuição de Energia", url: "/distribuicao", icon: Share2 },
      { title: "Simulador de Rateio", url: "/simulador", icon: Calculator },
    ],
  },
  {
    label: "Análise",
    items: [
      { title: "Análise Financeira", url: "/financeiro", icon: LineChart },
      { title: "Relatórios", url: "/relatorios", icon: FileText },
      { title: "Inteligência Artificial", url: "/ia", icon: Sparkles },
    ],
  },
  {
    label: "Sistema",
    items: [{ title: "Configurações", url: "/configuracoes", icon: Settings }],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

export function findNav(pathname: string) {
  for (const g of navGroups) {
    const item = g.items.find((i) => pathname === i.url || pathname.startsWith(`${i.url}/`));
    if (item) return { group: g.label, item };
  }
  return null;
}
