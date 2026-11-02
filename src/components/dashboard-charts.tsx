import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
import type { PorUnidade, SerieMensal } from "@/features/dashboard-data";

/** Ordem categórica fixa (validada para daltonismo); a cor segue a unidade, não o ranking. */
export const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--muted-foreground)", fontSize: 12 },
} as const;

type Fmt = (v: number) => string;
const kwh: Fmt = (v) => `${formatKwh(v)} kWh`;

function VizTooltip({
  active,
  payload,
  label,
  fmt,
  labelFmt,
}: TooltipProps<number, string> & {
  fmt: Fmt;
  labelFmt?: (l: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[10rem] rounded-xl border bg-card px-3 py-2 text-xs shadow-xl">
      {label !== undefined && (
        <p className="mb-1.5 font-semibold capitalize text-foreground">
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

export function GeracaoChart({ data }: { data: SerieMensal[] }) {
  const config = { geracao: { label: "Geração", color: "var(--chart-1)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fillGeracao" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-geracao)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-geracao)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="mes" tickFormatter={formatMesCurto} {...axisProps} />
        <YAxis tickFormatter={formatCompact} width={44} {...axisProps} />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          content={<VizTooltip fmt={kwh} labelFmt={formatMesLongo} />}
        />
        <Area
          dataKey="geracao"
          name="Geração"
          type="monotone"
          stroke="var(--color-geracao)"
          strokeWidth={2}
          fill="url(#fillGeracao)"
          connectNulls
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function GeracaoConsumoChart({ data }: { data: SerieMensal[] }) {
  const config = {
    geracao: { label: "Geração", color: "var(--chart-1)" },
    consumo: { label: "Consumo", color: "var(--chart-2)" },
  } satisfies ChartConfig;
  return (
    <div>
      <Legend
        items={[
          { label: "Geração", color: "var(--chart-1)" },
          { label: "Consumo", color: "var(--chart-2)" },
        ]}
      />
      <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="mes" tickFormatter={formatMesCurto} {...axisProps} />
          <YAxis tickFormatter={formatCompact} width={44} {...axisProps} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={<VizTooltip fmt={kwh} labelFmt={formatMesLongo} />}
          />
          {(["geracao", "consumo"] as const).map((k) => (
            <Line
              key={k}
              dataKey={k}
              name={config[k].label}
              type="monotone"
              stroke={`var(--color-${k})`}
              strokeWidth={2}
              dot={false}
              connectNulls
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
}

export function DespesasChart({ data }: { data: SerieMensal[] }) {
  const config = { despesas: { label: "Despesas", color: "var(--chart-2)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="mes" tickFormatter={formatMesCurto} {...axisProps} />
        <YAxis tickFormatter={(v: number) => `R$ ${formatCompact(v)}`} width={60} {...axisProps} />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          content={<VizTooltip fmt={formatBRL} labelFmt={formatMesLongo} />}
        />
        <Bar
          dataKey="despesas"
          name="Despesas"
          fill="var(--color-despesas)"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function ConsumoUnidadeChart({ data }: { data: PorUnidade[] }) {
  const config = { valor: { label: "Consumo", color: "var(--chart-2)" } } satisfies ChartConfig;
  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: Math.max(160, data.length * 56) }}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
        <XAxis type="number" tickFormatter={formatCompact} {...axisProps} />
        <YAxis
          type="category"
          dataKey="unidade"
          width={110}
          {...axisProps}
          tick={{ ...axisProps.tick, fill: "var(--foreground)" }}
        />
        <Tooltip cursor={{ fill: "var(--muted)" }} content={<VizTooltip fmt={kwh} />} />
        <Bar
          dataKey="valor"
          name="Consumo"
          fill="var(--color-valor)"
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function CreditosChart({
  data,
  colorOf,
}: {
  data: PorUnidade[];
  colorOf: (unidade: string) => string;
}) {
  const total = data.reduce((a, b) => a + b.valor, 0);
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <ChartContainer config={{}} className="aspect-square h-[200px] shrink-0">
        <PieChart>
          <Tooltip content={<VizTooltip fmt={kwh} />} />
          <Pie
            data={data}
            dataKey="valor"
            nameKey="unidade"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.unidade} fill={colorOf(d.unidade)} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="w-full space-y-3">
        {data.map((d) => (
          <li key={d.unidade} className="flex items-center gap-3 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: colorOf(d.unidade) }}
            />
            <span className="truncate text-foreground">{d.unidade}</span>
            <span className="tabular ml-auto font-semibold">{formatKwh(d.valor)} kWh</span>
            <span className="tabular w-12 text-right text-xs text-muted-foreground">
              {total > 0 ? `${Math.round((d.valor / total) * 100)}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-4">
      {items.map((i) => (
        <span
          key={i.label}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
        >
          <span className="h-0.5 w-4 rounded-full" style={{ background: i.color }} /> {i.label}
        </span>
      ))}
    </div>
  );
}
