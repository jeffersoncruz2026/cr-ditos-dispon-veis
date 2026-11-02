import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  Circle,
  Gauge,
  Home,
  Info,
  PieChart,
  PiggyBank,
  Plus,
  Receipt,
  ShieldAlert,
  Sun,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState, PageHeader, Panel } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ConsumoUnidadeChart,
  CreditosChart,
  DespesasChart,
  GeracaoChart,
  GeracaoConsumoChart,
  SERIES_COLORS,
} from "@/components/dashboard-charts";
import { useDashboardData, type DashboardData } from "@/features/dashboard-data";
import { capitalizar, formatBRL, formatKwh, formatMesLongo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SolarGest" }] }),
  component: Dashboard,
});

const TOTAL_UNIDADES_PREVISTAS = 4;

function Dashboard() {
  const { data, isLoading, isError } = useDashboardData();

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard"
        description="Geração, consumo, créditos e custos das unidades consumidoras da Equatorial Energia Goiás."
      >
        <div className="flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm shadow-card">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Competência:</span>
          <span className="font-semibold">
            {data?.competencia ? capitalizar(formatMesLongo(data.competencia)) : "sem lançamentos"}
          </span>
        </div>
        <Button asChild>
          <Link to="/unidades">
            <Plus className="h-4 w-4" /> Nova unidade
          </Link>
        </Button>
      </PageHeader>

      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Não foi possível carregar os dados do painel. Verifique sua conexão e tente novamente.
        </div>
      )}

      {data && !data.competencia && <Onboarding data={data} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          loading={isLoading}
          icon={Sun}
          tone="emerald"
          label="Geração solar mensal"
          value={data?.kpis.geracao}
          fmt={formatKwh}
          unit="kWh"
        />
        <Kpi
          loading={isLoading}
          icon={Zap}
          tone="emerald"
          label="Energia injetada"
          value={data?.kpis.injetada}
          fmt={formatKwh}
          unit="kWh"
        />
        <Kpi
          loading={isLoading}
          icon={Gauge}
          tone="navy"
          label="Consumo total das unidades"
          value={data?.kpis.consumo}
          fmt={formatKwh}
          unit="kWh"
        />
        <Kpi
          loading={isLoading}
          icon={Wallet}
          tone="navy"
          label="Saldo total de créditos"
          value={data?.kpis.saldoCreditos}
          fmt={formatKwh}
          unit="kWh"
        />
        <Kpi
          loading={isLoading}
          icon={Receipt}
          tone="navy"
          label="Valor total das faturas"
          value={data?.kpis.valorFaturas}
          fmt={formatBRL}
        />
        <Kpi
          loading={isLoading}
          icon={PiggyBank}
          tone="emerald"
          label="Economia estimada"
          value={data?.kpis.economia}
          fmt={formatBRL}
        />
        <Kpi
          loading={isLoading}
          icon={Home}
          tone="navy"
          label="Unidades consumidoras"
          value={data?.kpis.unidades}
          fmt={String}
          hint={`de ${TOTAL_UNIDADES_PREVISTAS} previstas`}
        />
        <Kpi
          loading={isLoading}
          icon={Bell}
          tone={data && data.kpis.alertas > 0 ? "amber" : "navy"}
          label="Alertas de consumo e créditos"
          value={data?.kpis.alertas}
          fmt={String}
          hint={data && data.kpis.alertas === 0 ? "Nenhum alerta em aberto" : "em aberto"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Evolução da geração solar"
          description="Geração mensal registrada, em kWh"
        >
          <ChartOrEmpty
            loading={isLoading}
            has={!!data?.serie.some((s) => s.geracao !== null)}
            icon={TrendingUp}
            text="Registre a geração mensal da usina para acompanhar a evolução."
          >
            {data && <GeracaoChart data={data.serie} />}
          </ChartOrEmpty>
        </Panel>
        <AlertasPanel loading={isLoading} data={data} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Consumo por residência"
          description="Consumo da competência atual por unidade, em kWh"
        >
          <ChartOrEmpty
            loading={isLoading}
            has={!!data?.consumoPorUnidade.length}
            icon={BarChart3}
            text="O consumo de cada unidade será exibido após a importação das faturas."
          >
            {data && <ConsumoUnidadeChart data={data.consumoPorUnidade} />}
          </ChartOrEmpty>
        </Panel>
        <Panel title="Distribuição dos créditos" description="Saldo atual de créditos por unidade">
          <ChartOrEmpty
            loading={isLoading}
            has={!!data?.creditosPorUnidade.length}
            icon={PieChart}
            text="A distribuição aparecerá quando houver saldo de créditos registrado."
          >
            {data && (
              <CreditosChart
                data={data.creditosPorUnidade}
                colorOf={(nome) => {
                  const i = data.unidadesNomes.indexOf(nome);
                  return SERIES_COLORS[i % SERIES_COLORS.length] ?? "var(--muted-foreground)";
                }}
              />
            )}
          </ChartOrEmpty>
        </Panel>
        <Panel title="Evolução das despesas" description="Valor total das faturas por competência">
          <ChartOrEmpty
            loading={isLoading}
            has={!!data?.serie.some((s) => s.despesas !== null)}
            icon={Receipt}
            text="As despesas mensais serão exibidas após o lançamento das faturas."
          >
            {data && <DespesasChart data={data.serie} />}
          </ChartOrEmpty>
        </Panel>
        <Panel title="Geração x Consumo" description="Comparativo mensal, em kWh">
          <ChartOrEmpty
            loading={isLoading}
            has={
              !!data?.serie.some((s) => s.geracao !== null) &&
              !!data?.serie.some((s) => s.consumo !== null)
            }
            icon={Activity}
            text="O comparativo requer registros de geração e de consumo."
          >
            {data && <GeracaoConsumoChart data={data.serie} />}
          </ChartOrEmpty>
        </Panel>
      </div>
    </>
  );
}

const tones = {
  emerald: "bg-accent text-accent-foreground",
  navy: "bg-primary/[0.07] text-primary",
  amber: "bg-warning/15 text-warning-foreground",
} as const;

function Kpi({
  icon: Icon,
  label,
  value,
  fmt,
  unit,
  hint,
  tone,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null | undefined;
  fmt: (v: number) => string;
  unit?: string;
  hint?: string;
  tone: keyof typeof tones;
  loading: boolean;
}) {
  const has = typeof value === "number";
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium leading-snug text-muted-foreground">{label}</p>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            tones[tone],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className="tabular mt-2 text-[26px] font-extrabold leading-none tracking-tight">
          {has ? fmt(value as number) : <span className="text-muted-foreground/50">—</span>}
          {has && unit && (
            <span className="ml-1.5 text-sm font-semibold text-muted-foreground">{unit}</span>
          )}
        </p>
      )}
      <p className="mt-2.5 text-xs text-muted-foreground">
        {loading ? " " : has ? (hint ?? "Competência atual") : "Aguardando lançamentos"}
      </p>
    </div>
  );
}

function ChartOrEmpty({
  loading,
  has,
  icon,
  text,
  children,
}: {
  loading: boolean;
  has: boolean;
  icon: LucideIcon;
  text: string;
  children: ReactNode;
}) {
  if (loading) return <Skeleton className="h-[240px] w-full rounded-xl" />;
  if (!has)
    return (
      <EmptyState
        icon={icon}
        title="Nenhum dado disponível"
        description={text}
        className="min-h-[240px]"
      />
    );
  return <>{children}</>;
}

const severidade = {
  critico: { icon: ShieldAlert, cls: "bg-destructive/10 text-destructive", label: "Crítico" },
  atencao: { icon: AlertTriangle, cls: "bg-warning/15 text-warning-foreground", label: "Atenção" },
  info: { icon: Info, cls: "bg-primary/[0.07] text-primary", label: "Informativo" },
} as const;

function AlertasPanel({ loading, data }: { loading: boolean; data: DashboardData | undefined }) {
  return (
    <Panel title="Alertas" description="Consumo e créditos que exigem atenção">
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : !data?.alertas.length ? (
        <EmptyState
          icon={CheckCircle2}
          title="Tudo em ordem"
          description="Nenhum alerta de consumo ou de créditos em aberto."
          className="min-h-[240px]"
        />
      ) : (
        <ul className="space-y-2.5">
          {data.alertas.map((a) => {
            const s = severidade[a.severidade as keyof typeof severidade] ?? severidade.info;
            return (
              <li key={a.id} className="flex items-start gap-3 rounded-xl border p-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    s.cls,
                  )}
                >
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.label} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function Onboarding({ data }: { data: DashboardData }) {
  const steps = [
    {
      done: data.kpis.unidades >= TOTAL_UNIDADES_PREVISTAS,
      title: "Cadastrar as unidades consumidoras",
      detail: `${data.kpis.unidades} de ${TOTAL_UNIDADES_PREVISTAS} cadastradas`,
      to: "/unidades" as const,
    },
    {
      done: data.usinas > 0,
      title: "Cadastrar a usina solar",
      detail: "Potência, módulos e unidade geradora",
      to: "/geracao" as const,
    },
    {
      done: false,
      title: "Importar as faturas do mês",
      detail: "Faturas da Equatorial Energia Goiás",
      to: "/importar-faturas" as const,
    },
    {
      done: false,
      title: "Registrar a geração mensal",
      detail: "Geração e energia injetada na rede",
      to: "/geracao" as const,
    },
  ];
  const concluidos = steps.filter((s) => s.done).length;

  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl bg-brand p-6 text-white shadow-card md:p-8">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <div className="relative grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
            Configuração inicial
          </Badge>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">
            Bem-vindo ao SolarGest
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">
            Os indicadores serão preenchidos automaticamente a partir dos dados lançados. Conclua as
            etapas abaixo para começar a acompanhar a geração e os créditos das suas unidades.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${(concluidos / steps.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-white/80">
              {concluidos} de {steps.length} etapas
            </span>
          </div>
        </div>
        <ol className="grid gap-2.5 sm:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Link
                to={s.to}
                className="group flex h-full items-start gap-3 rounded-xl border border-white/15 bg-white/[0.07] p-3.5 backdrop-blur transition hover:bg-white/[0.14]"
              >
                {s.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-white" />
                ) : (
                  <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                    <Circle className="absolute h-5 w-5 text-white/40" />
                    <span className="text-[10px] font-bold">{i + 1}</span>
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-semibold",
                      s.done && "line-through decoration-white/40",
                    )}
                  >
                    {s.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/65">{s.detail}</span>
                </span>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-white/50 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
