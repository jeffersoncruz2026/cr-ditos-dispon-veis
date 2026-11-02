import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sun, Zap, Gauge, Wallet, Receipt, PiggyBank, Home, Bell, BarChart3, PieChart, TrendingUp, Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SolarGest" }] }),
  component: Dashboard,
});

function Kpi({ icon: Icon, label, value, unit }: { icon: LucideIcon; label: string; value: string | null; unit?: string }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">
        {value ?? <span className="text-muted-foreground">—</span>}
        {value && unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>
      {!value && <p className="mt-1 text-xs text-muted-foreground">Sem dados ainda</p>}
    </div>
  );
}

function ChartSlot({ icon, title, wide }: { icon: LucideIcon; title: string; wide?: boolean }) {
  return (
    <div className={`rounded-2xl bg-card p-6 shadow-card ${wide ? "lg:col-span-2" : ""}`}>
      <h3 className="mb-4 font-semibold">{title}</h3>
      <EmptyState icon={icon} title="Nenhum dado disponível" description="O gráfico será exibido após o registro dos primeiros dados." />
    </div>
  );
}

function Dashboard() {
  const { data: unidades } = useQuery({
    queryKey: ["unidades-count"],
    queryFn: async () => {
      const { count } = await supabase.from("unidades_consumidoras").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral da geração, consumo e créditos de energia.">
        <Button asChild><Link to="/unidades">Cadastrar unidade</Link></Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Sun} label="Geração solar mensal" value={null} unit="kWh" />
        <Kpi icon={Zap} label="Energia injetada" value={null} unit="kWh" />
        <Kpi icon={Gauge} label="Consumo total" value={null} unit="kWh" />
        <Kpi icon={Wallet} label="Saldo de créditos" value={null} unit="kWh" />
        <Kpi icon={Receipt} label="Valor total das faturas" value={null} />
        <Kpi icon={PiggyBank} label="Economia estimada" value={null} />
        <Kpi icon={Home} label="Unidades consumidoras" value={unidades !== undefined ? String(unidades) : null} />
        <Kpi icon={Bell} label="Alertas" value={null} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartSlot icon={TrendingUp} title="Evolução da geração solar" wide />
        <ChartSlot icon={BarChart3} title="Consumo por residência" />
        <ChartSlot icon={PieChart} title="Distribuição dos créditos" />
        <ChartSlot icon={Receipt} title="Evolução das despesas" />
        <ChartSlot icon={Activity} title="Geração x Consumo" />
      </div>
    </>
  );
}
