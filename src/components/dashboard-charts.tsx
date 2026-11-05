import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  capitalizar,
  formatBRL,
  formatCompact,
  formatKwh,
  formatMesCurto,
  formatMesLongo,
} from "@/lib/format";
import type { ComparativoUnidade, PorUnidade, SerieMensal } from "@/features/dashboard-data";

/** Ordem categórica fixa; a cor segue a unidade (ordem de cadastro), nunca o ranking. */
export const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
export const corSerie = (i: number) => SERIES_COLORS[i % SERIES_COLORS.length]!;

const axisProps = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
} as const;

const grid = <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />;

type Fmt = (v: number) => string;
export const kwh: Fmt = (v) => `${formatKwh(v)} kWh`;
const pctFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
export const pct: Fmt = (v) => `${pctFmt.format(v)}%`;
const mesLongo = (l: string) => capitalizar(formatMesLongo(l));

function VizTooltip({
  active,
  payload,
  label,
  fmt,
  labelFmt,
}: TooltipProps<number, string> & { fmt: Fmt; labelFmt?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[11rem] rounded-lg border bg-popover px-3 py-2 text-xs shadow-card-hover">
      {label !== undefined && (
        <p className="mb-1.5 font-semibold text-foreground">
          {labelFmt ? labelFmt(String(label)) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={String(p.dataKey ?? p.name)} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: p.color ?? p.payload?.fill }}
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="tabular ml-auto pl-3 font-semibold text-foreground">
              {typeof p.value === "number" ? fmt(p.value) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Legenda({
  items,
}: {
  items: { label: string; color: string; forma?: "linha" | "barra" }[];
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <span
          key={i.label}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
        >
          <span
            className={
              i.forma === "linha" ? "h-0.5 w-3.5 rounded-full" : "h-2.5 w-2.5 rounded-[3px]"
            }
            style={{ background: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Geração solar (área) x energia injetada (linha), em kWh. */
export function GeracaoInjetadaChart({ data }: { data: SerieMensal[] }) {
  const config = {
    geracao: { label: "Geração", color: "var(--chart-1)" },
    injetada: { label: "Injetada", color: "var(--chart-2)" },
  } satisfies ChartConfig;
  return (
    <div>
      <Legenda
        items={[
          { label: "Geração solar", color: "var(--chart-1)" },
          { label: "Energia injetada", color: "var(--chart-2)", forma: "linha" },
        ]}
      />
      <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillGeracao" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-geracao)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-geracao)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {grid}
          <XAxis dataKey="mes" tickFormatter={formatMesCurto} {...axisProps} />
          <YAxis tickFormatter={formatCompact} width={50} {...axisProps} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={<VizTooltip fmt={kwh} labelFmt={mesLongo} />}
          />
          <Area
            dataKey="geracao"
            name="Geração"
            type="monotone"
            stroke="var(--color-geracao)"
            strokeWidth={2}
            fill="url(#fillGeracao)"
            connectNulls
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
          <Line
            dataKey="injetada"
            name="Injetada"
            type="monotone"
            stroke="var(--color-injetada)"
            strokeWidth={2}
            dot={false}
            connectNulls
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}

/** Saldo consolidado de créditos ao fim de cada competência. */
export function CreditosEvolucaoChart({ data }: { data: SerieMensal[] }) {
  const config = { creditos: { label: "Saldo", color: "var(--chart-3)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-[268px] w-full">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fillCreditos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-creditos)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-creditos)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {grid}
        <XAxis dataKey="mes" tickFormatter={formatMesCurto} {...axisProps} />
        <YAxis tickFormatter={formatCompact} width={50} {...axisProps} />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          content={<VizTooltip fmt={kwh} labelFmt={mesLongo} />}
        />
        <Area
          dataKey="creditos"
          name="Saldo de créditos"
          type="monotone"
          stroke="var(--color-creditos)"
          strokeWidth={2}
          fill="url(#fillCreditos)"
          connectNulls
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

/** Consumo da competência por unidade (barras horizontais, cor da unidade). */
export function ConsumoUnidadeChart({ data }: { data: PorUnidade[] }) {
  const config = { valor: { label: "Consumo", color: "var(--chart-2)" } } satisfies ChartConfig;
  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: Math.max(180, data.length * 52 + 24) }}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
        barCategoryGap="28%"
      >
        <CartesianGrid horizontal={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={formatCompact} {...axisProps} />
        <YAxis
          type="category"
          dataKey="unidade"
          width={124}
          {...axisProps}
          tick={{ ...axisProps.tick, fill: "var(--foreground)", fontSize: 12 }}
        />
        <Tooltip cursor={{ fill: "var(--muted)" }} content={<VizTooltip fmt={kwh} />} />
        <Bar dataKey="valor" name="Consumo" radius={[0, 6, 6, 0]} maxBarSize={26}>
          {data.map((d) => (
            <Cell key={d.unidadeId} fill={corSerie(d.cor)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Rosca com participação percentual de cada unidade. */
export function DistribuicaoChart({
  data,
  fmt,
  centro,
  participacao = true,
}: {
  data: PorUnidade[];
  fmt: Fmt;
  centro?: { valor: string; rotulo: string };
  /** Exibe a participação percentual ao lado do valor (dispensável quando o valor já é %). */
  participacao?: boolean;
}) {
  const total = data.reduce((a, b) => a + b.valor, 0);
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative shrink-0">
        <ChartContainer config={{}} className="aspect-square h-[190px]">
          <PieChart>
            <Tooltip content={<VizTooltip fmt={fmt} />} />
            <Pie
              data={data}
              dataKey="valor"
              nameKey="unidade"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={data.length > 1 ? 2 : 0}
              cornerRadius={4}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell key={d.unidadeId} fill={corSerie(d.cor)} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        {centro && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="tabular text-lg font-bold leading-none">{centro.valor}</span>
            <span className="mt-1 text-[11px] text-muted-foreground">{centro.rotulo}</span>
          </div>
        )}
      </div>
      <ul className="w-full space-y-2.5">
        {data.map((d) => (
          <li key={d.unidadeId} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: corSerie(d.cor) }}
            />
            <span className="min-w-0 truncate text-foreground">{d.unidade}</span>
            <span className="tabular ml-auto font-semibold">{fmt(d.valor)}</span>
            {participacao && (
              <span className="tabular w-11 text-right text-xs text-muted-foreground">
                {total > 0 ? `${Math.round((d.valor / total) * 100)}%` : "—"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Valor das faturas (barras) e economia estimada (linha) por competência. */
export function FinanceiroChart({ data }: { data: SerieMensal[] }) {
  const temEconomia = data.some((d) => d.economia !== null);
  const config = {
    despesas: { label: "Faturas", color: "var(--chart-2)" },
    economia: { label: "Economia", color: "var(--chart-1)" },
  } satisfies ChartConfig;
  return (
    <div>
      <Legenda
        items={[
          { label: "Valor das faturas", color: "var(--chart-2)" },
          ...(temEconomia
            ? [{ label: "Economia estimada", color: "var(--chart-1)", forma: "linha" as const }]
            : []),
        ]}
      />
      <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barCategoryGap="30%"
        >
          {grid}
          <XAxis dataKey="mes" tickFormatter={formatMesCurto} {...axisProps} />
          <YAxis
            tickFormatter={(v: number) => `R$ ${formatCompact(v)}`}
            width={58}
            {...axisProps}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={<VizTooltip fmt={formatBRL} labelFmt={mesLongo} />}
          />
          <Bar
            dataKey="despesas"
            name="Faturas"
            fill="var(--color-despesas)"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
          {temEconomia && (
            <Line
              dataKey="economia"
              name="Economia"
              type="monotone"
              stroke="var(--color-economia)"
              strokeWidth={2}
              dot={{ r: 2.5, strokeWidth: 0, fill: "var(--color-economia)" }}
              connectNulls
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            />
          )}
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}

/** Valor da fatura de cada unidade: competência anterior x atual. */
export function ComparativoFaturasChart({
  data,
  rotuloAtual,
  rotuloAnterior,
}: {
  data: ComparativoUnidade[];
  rotuloAtual: string;
  rotuloAnterior: string;
}) {
  const config = {
    anterior: { label: rotuloAnterior, color: "var(--muted-foreground)" },
    atual: { label: rotuloAtual, color: "var(--chart-2)" },
  } satisfies ChartConfig;
  return (
    <div>
      <Legenda
        items={[
          {
            label: rotuloAnterior,
            color: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
          },
          { label: rotuloAtual, color: "var(--chart-2)" },
        ]}
      />
      <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barCategoryGap="26%"
          barGap={3}
        >
          {grid}
          <XAxis
            dataKey="unidade"
            {...axisProps}
            interval={0}
            tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
          />
          <YAxis
            tickFormatter={(v: number) => `R$ ${formatCompact(v)}`}
            width={58}
            {...axisProps}
          />
          <Tooltip cursor={{ fill: "var(--muted)" }} content={<VizTooltip fmt={formatBRL} />} />
          <Bar
            dataKey="anterior"
            name={rotuloAnterior}
            fill="color-mix(in oklch, var(--muted-foreground) 45%, transparent)"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="atual"
            name={rotuloAtual}
            fill="var(--color-atual)"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export type MovimentoCreditos = {
  mes: string;
  recebidos: number | null;
  utilizados: number | null;
  saldo: number | null;
};

/** Créditos recebidos e utilizados (barras) e saldo consolidado (linha), por competência. */
export function MovimentoCreditosChart({ data }: { data: MovimentoCreditos[] }) {
  const config = {
    recebidos: { label: "Recebidos", color: "var(--chart-1)" },
    utilizados: { label: "Utilizados", color: "var(--chart-2)" },
    saldo: { label: "Saldo", color: "var(--chart-3)" },
  } satisfies ChartConfig;
  return (
    <div>
      <Legenda
        items={[
          { label: "Recebidos", color: "var(--chart-1)" },
          { label: "Utilizados", color: "var(--chart-2)" },
          { label: "Saldo consolidado", color: "var(--chart-3)", forma: "linha" },
        ]}
      />
      <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
          barCategoryGap="28%"
          barGap={2}
        >
          {grid}
          <XAxis dataKey="mes" tickFormatter={formatMesCurto} {...axisProps} />
          <YAxis yAxisId="mov" tickFormatter={formatCompact} width={44} {...axisProps} />
          <YAxis
            yAxisId="saldo"
            orientation="right"
            tickFormatter={formatCompact}
            width={44}
            {...axisProps}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={<VizTooltip fmt={kwh} labelFmt={mesLongo} />}
          />
          <Bar
            yAxisId="mov"
            dataKey="recebidos"
            name="Recebidos"
            fill="var(--color-recebidos)"
            radius={[5, 5, 0, 0]}
            maxBarSize={18}
          />
          <Bar
            yAxisId="mov"
            dataKey="utilizados"
            name="Utilizados"
            fill="var(--color-utilizados)"
            radius={[5, 5, 0, 0]}
            maxBarSize={18}
          />
          <Line
            yAxisId="saldo"
            dataKey="saldo"
            name="Saldo"
            type="monotone"
            stroke="var(--color-saldo)"
            strokeWidth={2}
            dot={false}
            connectNulls
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
