import {
  LayoutDashboard, Home, FileUp, CalendarCheck, Sun, Wallet, Share2, Calculator,
  LineChart, FileText, Sparkles, Settings,
} from "lucide-react";

export const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Unidades Consumidoras", url: "/unidades", icon: Home },
  { title: "Importar Faturas", url: "/importar-faturas", icon: FileUp },
  { title: "Fechamento Mensal", url: "/fechamento", icon: CalendarCheck },
  { title: "Geração Solar", url: "/geracao", icon: Sun },
  { title: "Gestão de Créditos", url: "/creditos", icon: Wallet },
  { title: "Distribuição de Energia", url: "/distribuicao", icon: Share2 },
  { title: "Simulador de Rateio", url: "/simulador", icon: Calculator },
  { title: "Análise Financeira", url: "/financeiro", icon: LineChart },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Inteligência Artificial", url: "/ia", icon: Sparkles },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
] as const;
