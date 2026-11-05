import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Circle,
  Clock,
  FileUp,
  Gauge,
  Home,
  Info,
  LineChart,
  PieChart,
  PiggyBank,
  Receipt,
  RefreshCw,
  ShieldAlert,
  Sun,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { EmptyState, Panel } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ComparativoFaturasChart,
  ConsumoUnidadeChart,
  CreditosEvolucaoChart,
  DistribuicaoChart,
  FinanceiroChart,
  GeracaoInjetadaChart,
  pct,
} from "@/components/dashboard-charts";
import { BarraProgresso, KpiCard, Segmentos, Tendencia } from "@/components/indicadores";
import {
  montarPainel,
  useDashboardBase,
  type Kpis,
  type Painel,
  type PorUnidade,
} from "@/features/dashboard-data";
import { useUnidades, type UnidadeComRateio } from "@/features/unidades/api";
import { formatPct, SituacaoBadge } from "@/features/unidades/shared";
import { capitalizar, formatBRL, formatKwh, formatMesCurto, formatMesLongo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SolarGest" }] }),
  component: Dashboard,
});

const TOTAL_UNIDADES_PREVISTAS = 4;
const TODAS = "todas";

function Dashboard() {
  const base = useDashboardBase();
  const unidades = useUnidades();
  const [competencia, setCompetencia] = useState<string | null>(null);
  const [unidadeId, setUnidadeId] = useState<string>(TODAS);
  const [meses, setMeses] = useState<6 | 12 | 24>(12);

  const painel = useMemo(
    () =>
      base.data
        ? montarPainel(base.data, {
            competencia,
            unidadeId: unidadeId === TODAS ? null : unidadeId,
            meses,
          })
        : undefined,
    [base.data, competencia, unidadeId, meses],
  );
  const loading = base.isLoading;

  return (
    <>
      <Cabecalho
        painel={painel}
        loading={loading}
        competencia={painel?.competencia ?? null}
        onCompetencia={setCompetencia}
        unidadeId={unidadeId}
        onUnidade={setUnidadeId}
        atualizando={base.isFetching && !loading}
      />

      {base.isError && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Não foi possível carregar os dados do painel. Verifique sua conexão e tente novamente.
        </div>
      )}

      {painel && !painel.competencia && <Onboarding painel={painel} />}

      <Indicadores painel={painel} loading={loading} />

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Desempenho energético</h2>
            <p className="text-[13px] text-muted-foreground">
              Evolução mensal até{" "}
              {painel?.competencia ? formatMesLongo(painel.competencia) : "a competência atual"}
            </p>
          </div>
          <Segmentos
            rotulo="Período dos gráficos"
            valor={meses}
            onChange={setMeses}
            opcoes={[
              { valor: 6, rotulo: "6 meses" },
              { valor: 12, rotulo: "12 meses" },
              { valor: 24, rotulo: "24 meses" },
            ]}
          />
        </div>
        <Graficos painel={painel} loading={loading} unidades={unidades.data} />
      </section>

      <MinhasUnidades
        painel={painel}
        unidades={unidades.data}
        loading={loading || unidades.isLoading}
      />

      {!!painel?.alertas.length && <AlertasPanel painel={painel} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Cabeçalho e filtros                                                 */
/* ------------------------------------------------------------------ */

function Cabecalho({
  painel,
  loading,
  competencia,
  onCompetencia,
  unidadeId,
  onUnidade,
  atualizando,
}: {
  painel: Painel | undefined;
  loading: boolean;
  competencia: string | null;
  onCompetencia: (v: string) => void;
  unidadeId: string;
  onUnidade: (v: string) => void;
  atualizando: boolean;
}) {
  const atualizado = painel?.atualizadoEm
    ? new Date(painel.atualizadoEm).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="mb-6 md:mb-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-baseline gap-x-2.5 text-xl font-bold tracking-tight md:text-2xl">
            <span>SolarGest</span>
            <span className="font-light text-border" aria-hidden>
              |
            </span>
            <span className="font-semibold text-muted-foreground">Visão Geral da Energia</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Geração, consumo, créditos e custos das unidades da Equatorial Goiás.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/importar-faturas">
            <FileUp className="h-4 w-4" /> Importar faturas
          </Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-2.5 rounded-xl border bg-card p-2.5 shadow-card sm:flex-row sm:flex-wrap sm:items-center">
        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
          <Select
            value={competencia ?? ""}
            onValueChange={onCompetencia}
            disabled={!painel?.competencias.length}
          >
            <SelectTrigger
              className="h-9 min-w-0 bg-background sm:w-[200px]"
              aria-label="Competência"
            >
              <SelectValue placeholder={loading ? "Carregando…" : "Sem competências"} />
            </SelectTrigger>
            <SelectContent>
              {painel?.competencias.map((m) => (
                <SelectItem key={m} value={m}>
                  {capitalizar(formatMesLongo(m))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={unidadeId} onValueChange={onUnidade} disabled={!painel?.unidades.length}>
            <SelectTrigger
              className="h-9 min-w-0 bg-background sm:w-[220px]"
              aria-label="Unidade consumidora"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as unidades</SelectItem>
              {painel?.unidades.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground sm:ml-auto">
          {atualizando ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Clock className="h-3.5 w-3.5" />
          )}
          {loading ? (
            <Skeleton className="h-4 w-36" />
          ) : atualizado ? (
            <span>
              Última atualização: <span className="font-medium text-foreground">{atualizado}</span>
            </span>
          ) : (
            <span>Nenhum lançamento registrado</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Indicadores                                                         */
/* ------------------------------------------------------------------ */

type DefKpi = {
  chave: keyof Kpis;
  titulo: string;
  icon: LucideIcon;
  tom: "esmeralda" | "azul" | "solar" | "neutro" | "alerta";
  fmt: (v: number) => string;
  unidade?: string;
  melhorQuandoSobe: boolean;
  ajuda: string;
};

const KPIS: DefKpi[] = [
  {
    chave: "geracao",
    titulo: "Geração solar",
    icon: Sun,
    tom: "solar",
    fmt: formatKwh,
    unidade: "kWh",
    melhorQuandoSobe: true,
    ajuda: "Energia gerada pela usina na competência, conforme os registros de geração solar.",
  },
  {
    chave: "injetada",
    titulo: "Energia injetada",
    icon: Zap,
    tom: "esmeralda",
    fmt: formatKwh,
    unidade: "kWh",
    melhorQuandoSobe: true,
    ajuda: "Energia injetada na rede da distribuidora no mês (medida pela Equatorial).",
  },
  {
    chave: "consumo",
    titulo: "Consumo total",
    icon: Gauge,
    tom: "azul",
    fmt: formatKwh,
    unidade: "kWh",
    melhorQuandoSobe: false,
    ajuda: "Soma do consumo informado nas faturas da competência.",
  },
  {
    chave: "saldoCreditos",
    titulo: "Créditos acumulados",
    icon: Wallet,
    tom: "esmeralda",
    fmt: formatKwh,
    unidade: "kWh",
    melhorQuandoSobe: true,
    ajuda: "Saldo de créditos: último registro de cada unidade até a competência selecionada.",
  },
  {
    chave: "compensada",
    titulo: "Energia compensada",
    icon: CheckCircle2,
    tom: "esmeralda",
    fmt: formatKwh,
    unidade: "kWh",
    melhorQuandoSobe: true,
    ajuda: "kWh abatidos nas faturas com créditos do SCEE na competência.",
  },
  {
    chave: "valorFaturas",
    titulo: "Valor total das faturas",
    icon: Receipt,
    tom: "azul",
    fmt: formatBRL,
    melhorQuandoSobe: false,
    ajuda: "Soma do total a pagar das faturas da competência.",
  },
  {
    chave: "economia",
    titulo: "Economia estimada",
    icon: PiggyBank,
    tom: "esmeralda",
    fmt: formatBRL,
    melhorQuandoSobe: true,
    ajuda: "Soma da economia estimada registrada nas faturas da competência.",
  },
  {
    chave: "alertas",
    titulo: "Alertas ativos",
    icon: Bell,
    tom: "neutro",
    fmt: String,
    melhorQuandoSobe: false,
    ajuda: "Alertas de consumo e créditos ainda não resolvidos.",
  },
];

function Indicadores({ painel, loading }: { painel: Painel | undefined; loading: boolean }) {
  const rotuloAnterior = painel?.anterior ? `vs ${formatMesCurto(painel.anterior)}` : undefined;
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {KPIS.map((k) => {
        const v = painel?.kpis[k.chave];
        const alertas = k.chave === "alertas";
        const ativo = alertas && typeof v === "number" && v > 0;
        return (
          <KpiCard
            key={k.chave}
            icon={k.icon}
            tom={ativo ? "alerta" : k.tom}
            titulo={k.titulo}
            ajuda={k.ajuda}
            loading={loading}
            destaque={ativo}
            valor={typeof v === "number" ? k.fmt(v) : null}
            unidade={k.unidade}
            rodape={
              alertas ? (
                <span className={ativo ? "font-medium text-destructive" : "text-muted-foreground"}>
                  {ativo ? "Exigem atenção" : "Nenhum alerta em aberto"}
                </span>
              ) : typeof v !== "number" ? (
                <span className="text-muted-foreground">Aguardando lançamentos</span>
              ) : (
                <Tendencia
                  atual={v}
                  anterior={painel?.kpisAnteriores?.[k.chave]}
                  melhorQuandoSobe={k.melhorQuandoSobe}
                  rotulo={rotuloAnterior}
                />
              )
            }
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gráficos                                                            */
/* ------------------------------------------------------------------ */

function Graficos({
  painel,
  loading,
  unidades,
}: {
  painel: Painel | undefined;
  loading: boolean;
  unidades: UnidadeComRateio[] | undefined;
}) {
  const serie = painel?.serie ?? [];
  const tem = (k: keyof (typeof serie)[number]) => serie.some((s) => s[k] !== null);

  // Distribuição percentual da energia: rateio vigente cadastrado.
  const indice = new Map(painel?.unidades.map((u, i) => [u.id, i]));
  const distribuicao: PorUnidade[] = (unidades ?? [])
    .filter((u) => typeof u.percentual === "number" && u.percentual > 0)
    .map((u) => ({
      unidadeId: u.id,
      unidade: u.nome,
      valor: u.percentual as number,
      cor: indice.get(u.id) ?? 0,
    }))
    .sort((a, b) => a.cor - b.cor);
  const somaRateio = distribuicao.reduce((a, b) => a + b.valor, 0);

  return (
    <div className="grid gap-4 md:gap-5 xl:grid-cols-2">
      <Panel title="Geração solar x energia injetada" description="kWh por competência">
        <ChartOrEmpty
          loading={loading}
          has={tem("geracao") || tem("injetada")}
          icon={TrendingUp}
          text="Registre a geração mensal da usina para acompanhar a evolução."
        >
          <GeracaoInjetadaChart data={serie} />
        </ChartOrEmpty>
      </Panel>
      <Panel
        title="Evolução dos créditos"
        description="Saldo consolidado ao fim de cada mês, em kWh"
      >
        <ChartOrEmpty
          loading={loading}
          has={tem("creditos")}
          icon={Wallet}
          text="A evolução aparecerá quando houver saldos de créditos registrados."
        >
          <CreditosEvolucaoChart data={serie} />
        </ChartOrEmpty>
      </Panel>

      <Panel title="Consumo por residência" description="Competência selecionada, em kWh">
        <ChartOrEmpty
          loading={loading}
          has={!!painel?.consumoPorUnidade.length}
          icon={BarChart3}
          text="O consumo de cada unidade será exibido após a importação das faturas."
        >
          {painel && <ConsumoUnidadeChart data={painel.consumoPorUnidade} />}
        </ChartOrEmpty>
      </Panel>
      <Panel
        title="Distribuição percentual de energia"
        description="Rateio vigente entre as unidades"
      >
        <ChartOrEmpty
          loading={loading || !unidades}
          has={distribuicao.length > 0}
          icon={PieChart}
          text="Cadastre a configuração de rateio para visualizar a distribuição."
        >
          <DistribuicaoChart
            data={distribuicao}
            fmt={pct}
            participacao={false}
            centro={{ valor: formatPct(somaRateio), rotulo: "distribuído" }}
          />
        </ChartOrEmpty>
      </Panel>

      <Panel title="Evolução financeira" description="Valor das faturas e economia estimada">
        <ChartOrEmpty
          loading={loading}
          has={tem("despesas")}
          icon={LineChart}
          text="Os valores mensais serão exibidos após o lançamento das faturas."
        >
          <FinanceiroChart data={serie} />
        </ChartOrEmpty>
      </Panel>
      <Panel
        title="Comparativo de faturas"
        description={
          painel?.competencia
            ? `Valor por unidade: ${formatMesCurto(mesAnteriorRotulo(painel))} x ${formatMesCurto(painel.competencia)}`
            : "Valor por unidade, mês anterior x competência"
        }
      >
        <ChartOrEmpty
          loading={loading}
          has={!!painel?.comparativoFaturas.some((c) => c.atual !== null || c.anterior !== null)}
          icon={Receipt}
          text="O comparativo requer faturas lançadas na competência."
        >
          {painel?.competencia && (
            <ComparativoFaturasChart
              data={painel.comparativoFaturas}
              rotuloAtual={capitalizar(formatMesCurto(painel.competencia))}
              rotuloAnterior={capitalizar(formatMesCurto(mesAnteriorRotulo(painel)))}
            />
          )}
        </ChartOrEmpty>
      </Panel>
    </div>
  );
}

/** Mês anterior à competência (mesmo sem lançamentos, para o rótulo do comparativo). */
function mesAnteriorRotulo(p: Painel) {
  const [y = 1970, m = 1] = (p.competencia ?? "1970-01-01").split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
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
  if (loading) return <Skeleton className="h-[260px] w-full rounded-lg" />;
  if (!has)
    return (
      <EmptyState
        icon={icon}
        title="Nenhum dado disponível"
        description={text}
        className="min-h-[260px]"
        compact
      />
    );
  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/* Minhas unidades consumidoras                                        */
/* ------------------------------------------------------------------ */

function MinhasUnidades({
  painel,
  unidades,
  loading,
}: {
  painel: Painel | undefined;
  unidades: UnidadeComRateio[] | undefined;
  loading: boolean;
}) {
  const lista = (unidades ?? []).filter((u) => u.situacao !== "inativa");
  let recebedora = 0;
  const rotulos = new Map(
    lista.map((u) => [u.id, u.geradora ? "Unidade geradora" : `Recebedora ${++recebedora}`]),
  );

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Minhas Unidades Consumidoras</h2>
          <p className="text-[13px] text-muted-foreground">
            {painel?.competencia
              ? `Dados da competência ${formatMesLongo(painel.competencia)}`
              : "Situação atual de cada unidade"}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary">
          <Link to="/unidades">
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[248px] rounded-xl" />
          ))}
        </div>
      ) : !lista.length ? (
        <EmptyState
          icon={Home}
          title="Nenhuma unidade cadastrada"
          description="Cadastre as unidades consumidoras para acompanhar consumo, créditos e rateio."
          action={
            <Button asChild size="sm">
              <Link to="/unidades">Cadastrar unidades</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {lista.map((u) => (
            <CardUnidade
              key={u.id}
              unidade={u}
              tipo={rotulos.get(u.id) ?? ""}
              dados={painel?.porUnidade.get(u.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const statusFatura: Record<string, { label: string; cls: string }> = {
  paga: { label: "Paga", cls: "text-accent-foreground" },
  pendente: { label: "Em aberto", cls: "text-info" },
  vencida: { label: "Vencida", cls: "text-destructive" },
};

function CardUnidade({
  unidade: u,
  tipo,
  dados,
}: {
  unidade: UnidadeComRateio;
  tipo: string;
  dados: Painel["porUnidade"] extends Map<string, infer V> ? V | undefined : never;
}) {
  // Unidade aguardando inclusão: o rateio real ainda não a contempla (sem percentual vigente).
  const pendente = u.situacao === "aguardando_rateio" && !u.percentual;
  const percentual = pendente ? null : u.percentual;
  const status = dados?.status ? statusFatura[dados.status] : null;
  return (
    <Link
      to="/unidades/$unidadeId"
      params={{ unidadeId: u.id }}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-card outline-none transition-all duration-200 hover:border-primary/30 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      {u.geradora && <span className="absolute inset-x-0 top-0 h-0.5 bg-solar" aria-hidden />}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            u.geradora ? "bg-solar/15 text-solar-foreground" : "bg-info-soft text-info",
          )}
        >
          {u.geradora ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Home className="h-[18px] w-[18px]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{u.nome}</p>
          <p className="tabular truncate text-xs text-muted-foreground">UC {u.numero_uc}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:text-primary" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
            u.geradora ? "bg-solar/15 text-solar-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {tipo}
        </span>
        <SituacaoBadge situacao={u.situacao} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
        <Metrica
          rotulo="Consumo mensal"
          valor={typeof dados?.consumo === "number" ? `${formatKwh(dados.consumo)} kWh` : null}
        />
        <Metrica
          rotulo="Créditos"
          valor={typeof dados?.creditos === "number" ? `${formatKwh(dados.creditos)} kWh` : null}
        />
        <Metrica
          rotulo="Valor da fatura"
          valor={typeof dados?.valor === "number" ? formatBRL(dados.valor) : null}
        />
        <Metrica
          rotulo="Rateio"
          valor={
            typeof percentual === "number" ? formatPct(percentual) : pendente ? "Pendente" : null
          }
        />
      </dl>

      <div className="mt-auto pt-4">
        <BarraProgresso
          valor={typeof percentual === "number" ? percentual : 0}
          cor={u.geradora ? "var(--solar)" : "var(--primary)"}
        />
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
          <span className="truncate text-muted-foreground">
            {typeof percentual === "number"
              ? `${formatPct(percentual)} da energia`
              : pendente
                ? "Aguardando inclusão"
                : "Fora do rateio vigente"}
          </span>
          {status && <span className={cn("shrink-0 font-medium", status.cls)}>{status.label}</span>}
        </div>
      </div>
    </Link>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="tabular mt-0.5 truncate text-[13px] font-semibold">
        {valor ?? <span className="font-normal text-muted-foreground/60">—</span>}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Alertas e onboarding                                                */
/* ------------------------------------------------------------------ */

const severidade = {
  critico: { icon: ShieldAlert, cls: "bg-destructive/10 text-destructive", label: "Crítico" },
  atencao: { icon: AlertTriangle, cls: "bg-solar/15 text-solar-foreground", label: "Atenção" },
  info: { icon: Info, cls: "bg-info-soft text-info", label: "Informativo" },
} as const;

function AlertasPanel({ painel }: { painel: Painel }) {
  const nome = (id: string | null) => painel.unidades.find((u) => u.id === id)?.nome;
  return (
    <Panel
      className="mt-8"
      title="Alertas ativos"
      description="Consumo e créditos que exigem atenção"
      action={<Badge variant="secondary">{painel.alertas.length}</Badge>}
    >
      <ul className="grid gap-2.5 md:grid-cols-2">
        {painel.alertas.slice(0, 6).map((a) => {
          const s = severidade[a.severidade as keyof typeof severidade] ?? severidade.info;
          return (
            <li key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
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
                  {s.label}
                  {nome(a.unidade_id) ? ` · ${nome(a.unidade_id)}` : ""} ·{" "}
                  {new Date(a.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function Onboarding({ painel }: { painel: Painel }) {
  const steps = [
    {
      done: painel.unidades.length >= TOTAL_UNIDADES_PREVISTAS,
      title: "Cadastrar as unidades consumidoras",
      detail: `${painel.unidades.length} de ${TOTAL_UNIDADES_PREVISTAS} cadastradas`,
      to: "/unidades" as const,
    },
    {
      done: painel.usinas > 0,
      title: "Cadastrar a usina solar",
      detail: "Potência, módulos e unidade geradora",
      to: "/geracao" as const,
    },
    {
      done: false,
      title: "Importar as faturas do mês",
      detail: "XML das notas da Equatorial Goiás",
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
    <section className="relative mb-6 overflow-hidden rounded-xl bg-brand p-5 text-white shadow-card md:p-7">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
            Configuração inicial
          </Badge>
          <h2 className="mt-3 text-xl font-bold tracking-tight md:text-2xl">
            Bem-vindo ao SolarGest
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">
            Os indicadores são preenchidos automaticamente a partir dos dados lançados. Conclua as
            etapas para acompanhar a geração e os créditos das suas unidades.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-solar"
                style={{ width: `${(concluidos / steps.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-white/80">
              {concluidos} de {steps.length} etapas
            </span>
          </div>
        </div>
        <ol className="grid gap-2 sm:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Link
                to={s.to}
                className="group flex h-full items-start gap-3 rounded-lg border border-white/12 bg-white/[0.06] p-3 transition hover:bg-white/[0.12]"
              >
                {s.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
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
