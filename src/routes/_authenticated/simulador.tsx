import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Equal,
  Home,
  Info,
  RotateCcw,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, PageHeader, Panel } from "@/components/empty-state";
import { BarraProgresso } from "@/components/indicadores";
import { corSerie } from "@/components/dashboard-charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardBase } from "@/features/dashboard-data";
import { useUnidades, type UnidadeComRateio } from "@/features/unidades/api";
import { validarRateio } from "@/features/unidades/rateio-dialog";
import { formatPct, parseDecimal } from "@/features/unidades/shared";
import { formatBRL, formatKwh, mesKey } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/simulador")({
  head: () => ({ meta: [{ title: "Simulador de Rateio — SolarGest" }] }),
  component: Page,
});

/** Meses considerados nas médias de referência. */
const JANELA = 6;

const media = (v: (number | null | undefined)[]) => {
  const n = v.filter((x): x is number => typeof x === "number");
  return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
};

function Page() {
  const unidades = useUnidades();
  const base = useDashboardBase();
  const ativas = useMemo(
    () => (unidades.data ?? []).filter((u) => u.situacao !== "inativa"),
    [unidades.data],
  );

  const [valores, setValores] = useState<Record<string, number>>({});
  const vigentes = useMemo(
    () => Object.fromEntries(ativas.map((u) => [u.id, u.percentual ?? 0])),
    [ativas],
  );
  useEffect(() => {
    if (ativas.length && !Object.keys(valores).length) setValores(vigentes);
  }, [ativas, vigentes, valores]);

  // Médias de referência (últimos meses com registro): somente leitura dos dados existentes.
  const referencia = useMemo(() => {
    if (!base.data) return null;
    const meses = [...new Set(base.data.geracao.map((g) => mesKey(g.mes_referencia)))]
      .sort()
      .slice(-JANELA);
    const injetadaMedia = media(
      meses.map((m) =>
        base.data.geracao
          .filter((g) => mesKey(g.mes_referencia) === m)
          .reduce<number | null>((a, g) => (g.energia_injetada_kwh ?? 0) + (a ?? 0), null),
      ),
    );
    const porUnidade = new Map(
      ativas.map((u) => {
        const fs = base.data.faturas
          .filter((f) => f.unidade_id === u.id)
          .sort((a, b) => b.mes_referencia.localeCompare(a.mes_referencia))
          .slice(0, JANELA);
        const credito = base.data.creditos
          .filter((c) => c.unidade_id === u.id)
          .sort((a, b) => b.mes_referencia.localeCompare(a.mes_referencia))[0];
        return [
          u.id,
          {
            consumo: media(fs.map((f) => f.consumo_kwh)),
            economia: media(fs.map((f) => f.economia_estimada)),
            creditos: credito?.saldo_atual_kwh ?? null,
          },
        ];
      }),
    );
    return { injetadaMedia, porUnidade, meses: meses.length };
  }, [base.data, ativas]);

  const linhas = ativas.map((u) => ({ unidade: u, valor: valores[u.id] ?? 0 }));
  const { erros, soma } = validarRateio(linhas, "simulacao", null);
  const valido = erros.length === 0;
  const alterado = ativas.some((u) => (valores[u.id] ?? 0) !== vigentes[u.id]);
  const restante = Math.round((100 - soma) * 100) / 100;

  const definir = (id: string, v: number) =>
    setValores((s) => ({ ...s, [id]: Math.round(Math.max(0, Math.min(100, v)) * 100) / 100 }));
  const igualmente = () => {
    const elegiveis = ativas.filter((u) => u.situacao !== "inativa");
    const parte = Math.floor(10000 / elegiveis.length) / 100;
    const resto = Math.round((100 - parte * elegiveis.length) * 100) / 100;
    setValores(
      Object.fromEntries(
        elegiveis.map((u, i) => [u.id, i === 0 ? Math.round((parte + resto) * 100) / 100 : parte]),
      ),
    );
  };

  const loading = unidades.isLoading || base.isLoading;

  return (
    <>
      <PageHeader
        eyebrow="Inteligência"
        title="Simulador de Rateio"
        description="Teste cenários de distribuição da energia antes de solicitar alterações à concessionária. A simulação não altera o rateio cadastrado."
      >
        <Button variant="outline" onClick={igualmente} disabled={!ativas.length}>
          <Equal className="h-4 w-4" /> Distribuir igualmente
        </Button>
        <Button variant="outline" onClick={() => setValores(vigentes)} disabled={!alterado}>
          <RotateCcw className="h-4 w-4" /> Restaurar vigente
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Skeleton className="h-[420px] rounded-xl" />
          <Skeleton className="h-[420px] rounded-xl" />
        </div>
      ) : !ativas.length ? (
        <EmptyState
          icon={Calculator}
          title="Nenhuma unidade para simular"
          description="Cadastre as unidades consumidoras para montar cenários de rateio."
          action={
            <Button asChild size="sm">
              <Link to="/unidades">Cadastrar unidades</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Panel
            title="Distribuição simulada"
            description="Ajuste o percentual de cada unidade"
            action={<StatusSoma soma={soma} valido={valido} />}
          >
            <ul className="space-y-5">
              {ativas.map((u, i) => (
                <LinhaSlider
                  key={u.id}
                  unidade={u}
                  cor={corSerie(i)}
                  valor={valores[u.id] ?? 0}
                  vigente={vigentes[u.id] ?? 0}
                  onChange={(v) => definir(u.id, v)}
                />
              ))}
            </ul>

            <div className="mt-6 rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Soma dos percentuais</span>
                <span
                  className={cn(
                    "tabular font-bold",
                    valido ? "text-accent-foreground" : "text-destructive",
                  )}
                >
                  {formatPct(soma)}
                </span>
              </div>
              <BarraProgresso
                valor={soma}
                cor={valido ? "var(--success)" : soma > 100 ? "var(--destructive)" : "var(--solar)"}
              />
              {!valido && (
                <ul className="mt-3 space-y-1">
                  {erros.map((e) => (
                    <li key={e} className="flex items-start gap-1.5 text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {e}
                    </li>
                  ))}
                  {restante !== 0 && (
                    <li className="text-xs text-muted-foreground">
                      {restante > 0
                        ? `Faltam ${formatPct(restante)} para completar 100%.`
                        : `Excedente de ${formatPct(-restante)}.`}
                    </li>
                  )}
                </ul>
              )}
            </div>
          </Panel>

          <div className="min-w-0 space-y-5">
            <Panel
              title="Comparativo entre cenários"
              description="Distribuição atual x simulada e referências de consumo"
            >
              <Comparativo
                unidades={ativas}
                valores={valores}
                vigentes={vigentes}
                referencia={referencia}
              />
            </Panel>
            <div className="flex items-start gap-2.5 rounded-lg border border-dashed bg-card p-3 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
              <p>
                <strong className="text-foreground">Energia estimada</strong> é uma referência
                simples: média da energia injetada nos últimos {referencia?.meses || JANELA} meses ×
                percentual. Consumo e economia são médias das faturas registradas; créditos
                acumulados é o último saldo. O valor real depende da apuração da Equatorial. Para
                alterar o rateio, use{" "}
                <Link to="/unidades" className="font-medium text-primary hover:underline">
                  Unidades Consumidoras
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatusSoma({ soma, valido }: { soma: number; valido: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
        valido ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive",
      )}
    >
      {valido ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5" />
      )}
      {valido ? "Distribuição válida" : `Soma ${formatPct(soma)}`}
    </span>
  );
}

function LinhaSlider({
  unidade: u,
  cor,
  valor,
  vigente,
  onChange,
}: {
  unidade: UnidadeComRateio;
  cor: string;
  valor: number;
  vigente: number;
  onChange: (v: number) => void;
}) {
  const [texto, setTexto] = useState(String(valor).replace(".", ","));
  useEffect(() => setTexto(String(valor).replace(".", ",")), [valor]);
  const diff = Math.round((valor - vigente) * 100) / 100;
  return (
    <li>
      <div className="mb-2 flex items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            u.geradora ? "bg-solar/15 text-solar-foreground" : "bg-info-soft text-info",
          )}
        >
          {u.geradora ? <Sun className="h-4 w-4" /> : <Home className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{u.nome}</p>
          <p className="text-xs text-muted-foreground">
            Vigente: {formatPct(vigente)}
            {u.situacao === "aguardando_rateio" && " · aguardando inclusão"}
            {diff !== 0 && (
              <span
                className={cn(
                  "ml-1 font-medium",
                  diff > 0 ? "text-accent-foreground" : "text-destructive",
                )}
              >
                ({diff > 0 ? "+" : "−"}
                {formatPct(Math.abs(diff))})
              </span>
            )}
          </p>
        </div>
        <div className="relative w-[84px] shrink-0">
          <Input
            inputMode="decimal"
            aria-label={`Percentual simulado de ${u.nome}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={() => {
              const n = parseDecimal(texto);
              if (n === null) setTexto(String(valor).replace(".", ","));
              else onChange(n);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="tabular h-8 pr-6 text-right"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            %
          </span>
        </div>
      </div>
      <Slider
        value={[valor]}
        min={0}
        max={100}
        step={0.5}
        onValueChange={([v]) => onChange(v ?? 0)}
        aria-label={`Ajustar percentual de ${u.nome}`}
        style={{ "--primary": cor } as React.CSSProperties}
      />
    </li>
  );
}

function Comparativo({
  unidades,
  valores,
  vigentes,
  referencia,
}: {
  unidades: UnidadeComRateio[];
  valores: Record<string, number>;
  vigentes: Record<string, number>;
  referencia: {
    injetadaMedia: number | null;
    porUnidade: Map<
      string,
      { consumo: number | null; economia: number | null; creditos: number | null }
    >;
  } | null;
}) {
  const inj = referencia?.injetadaMedia ?? null;
  const estimada = (p: number) => (inj === null ? null : (inj * p) / 100);
  const kwh = (v: number | null) =>
    v === null ? <span className="text-muted-foreground">—</span> : formatKwh(v);

  return (
    <>
      <div className="mb-5 space-y-3">
        {unidades.map((u, i) => {
          const atual = vigentes[u.id] ?? 0;
          const sim = valores[u.id] ?? 0;
          return (
            <div
              key={u.id}
              className="grid grid-cols-[minmax(0,110px)_1fr] items-center gap-3 text-xs"
            >
              <span className="truncate font-medium">{u.nome}</span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BarraProgresso
                    valor={atual}
                    cor="color-mix(in oklch, var(--muted-foreground) 45%, transparent)"
                  />
                  <span className="tabular w-12 shrink-0 text-right text-muted-foreground">
                    {formatPct(atual)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BarraProgresso valor={sim} cor={corSerie(i)} />
                  <span className="tabular w-12 shrink-0 text-right font-semibold">
                    {formatPct(sim)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex gap-4 pl-[122px] text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-full bg-muted-foreground/45" /> Atual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-full bg-primary" /> Simulada
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Unidade</TableHead>
              <TableHead className="text-right">Consumo médio</TableHead>
              <TableHead className="text-right">Créditos</TableHead>
              <TableHead className="text-right">Energia vigente</TableHead>
              <TableHead className="text-right">Energia simulada</TableHead>
              <TableHead className="pr-4 text-right">Economia média</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unidades.map((u) => {
              const r = referencia?.porUnidade.get(u.id);
              const atual = estimada(vigentes[u.id] ?? 0);
              const sim = estimada(valores[u.id] ?? 0);
              const cobre = sim !== null && r?.consumo ? sim >= r.consumo : null;
              return (
                <TableRow key={u.id}>
                  <TableCell className="whitespace-nowrap pl-4 font-medium">{u.nome}</TableCell>
                  <TableCell className="tabular text-right">{kwh(r?.consumo ?? null)}</TableCell>
                  <TableCell className="tabular text-right">{kwh(r?.creditos ?? null)}</TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">
                    {kwh(atual)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "tabular text-right font-semibold",
                      cobre === true && "text-accent-foreground",
                      cobre === false && "text-solar-foreground",
                    )}
                    title={
                      cobre === null
                        ? undefined
                        : cobre
                          ? "Cobre o consumo médio"
                          : "Abaixo do consumo médio"
                    }
                  >
                    {kwh(sim)}
                  </TableCell>
                  <TableCell className="tabular pr-4 text-right">
                    {typeof r?.economia === "number" ? (
                      formatBRL(r.economia)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Energia em kWh/mês. Verde: energia simulada cobre o consumo médio; âmbar: abaixo do consumo.
      </p>
    </>
  );
}
