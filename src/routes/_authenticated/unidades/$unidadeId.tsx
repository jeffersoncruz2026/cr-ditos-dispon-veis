import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  Cpu,
  FileText,
  Gauge,
  History,
  MapPin,
  Pencil,
  PieChart,
  Receipt,
  SearchX,
  Sun,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, Panel } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartContainer } from "@/components/ui/chart";
import { useCurrentAccess } from "@/hooks/use-access";
import {
  capitalizar,
  formatBRL,
  formatCompact,
  formatKwh,
  formatMesCurto,
  formatMesLongo,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useHistoricoUnidade,
  useUnidades,
  type RateioConfiguracao,
  type UnidadeComRateio,
} from "@/features/unidades/api";
import {
  formatPct,
  ligacoes,
  SituacaoBadge,
  TipoBadge,
  UnidadeIcon,
} from "@/features/unidades/shared";
import { UnidadeFormDialog } from "@/features/unidades/unidade-form-dialog";

export const Route = createFileRoute("/_authenticated/unidades/$unidadeId")({
  head: () => ({ meta: [{ title: "Unidade Consumidora — SolarGest" }] }),
  component: DetalheUnidade,
});

const kwh = (v: number | null | undefined) => (typeof v === "number" ? `${formatKwh(v)} kWh` : "—");
const brl = (v: number | null | undefined) => (typeof v === "number" ? formatBRL(v) : "—");
const data = (v: string | null | undefined) =>
  v ? new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";

function DetalheUnidade() {
  const { unidadeId } = Route.useParams();
  const { canWrite } = useCurrentAccess();
  const { data: unidades, rateios, vigente, programada, isLoading } = useUnidades();
  const historico = useHistoricoUnidade(unidadeId);
  const [editando, setEditando] = useState(false);

  const unidade = unidades?.find((u) => u.id === unidadeId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!unidade) {
    return (
      <Panel>
        <EmptyState
          icon={SearchX}
          title="Unidade não encontrada"
          description="A unidade pode ter sido excluída ou o endereço está incorreto."
          action={
            <Button asChild variant="outline">
              <Link to="/unidades">
                <ArrowLeft className="h-4 w-4" /> Voltar para unidades
              </Link>
            </Button>
          }
        />
      </Panel>
    );
  }

  const faturas = historico.data?.faturas ?? [];
  const creditos = historico.data?.creditos ?? [];
  const ultimaFatura = faturas[0];
  const ultimoCredito = creditos[0];
  const percentualProgramado = programada
    ? (programada.itens.find((i) => i.unidade_id === unidade.id)?.percentual ?? 0)
    : null;
  const historicoRateio = rateios
    .map((c) => ({ config: c, item: c.itens.find((i) => i.unidade_id === unidade.id) }))
    .filter(
      (r): r is { config: RateioConfiguracao; item: { unidade_id: string; percentual: number } } =>
        !!r.item,
    );

  return (
    <>
      <Link
        to="/unidades"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Unidades consumidoras
      </Link>

      <section className="mb-6 flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-card md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-4">
          <UnidadeIcon geradora={unidade.geradora} className="h-14 w-14 rounded-2xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{unidade.nome}</h1>
              <TipoBadge geradora={unidade.geradora} />
              <SituacaoBadge situacao={unidade.situacao} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              UC <span className="tabular font-semibold text-foreground">{unidade.numero_uc}</span>
              {" · "}
              {unidade.distribuidora}
            </p>
          </div>
        </div>
        {canWrite && (
          <Button variant="outline" onClick={() => setEditando(true)}>
            <Pencil className="h-4 w-4" /> Editar cadastro
          </Button>
        )}
      </section>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          icon={PieChart}
          label="Rateio vigente"
          valor={unidade.percentual === null ? "—" : formatPct(unidade.percentual)}
          detalhe={
            percentualProgramado !== null && programada
              ? `${formatPct(percentualProgramado)} a partir de ${formatMesLongo(programada.vigencia_inicio)}`
              : vigente
                ? `desde ${formatMesLongo(vigente.vigencia_inicio)}`
                : "Sem rateio definido"
          }
        />
        <Indicador
          icon={Wallet}
          label="Saldo de créditos"
          loading={historico.isLoading}
          valor={kwh(ultimoCredito?.saldo_atual_kwh)}
          detalhe={
            ultimoCredito
              ? `conforme fatura de ${formatMesLongo(ultimoCredito.mes_referencia)}`
              : "Obtido das faturas importadas"
          }
        />
        <Indicador
          icon={Gauge}
          label="Último consumo"
          loading={historico.isLoading}
          valor={kwh(ultimaFatura?.consumo_kwh)}
          detalhe={ultimaFatura ? formatMesLongo(ultimaFatura.mes_referencia) : "Nenhuma fatura"}
        />
        <Indicador
          icon={Receipt}
          label="Última fatura"
          loading={historico.isLoading}
          valor={brl(ultimaFatura?.valor_total)}
          detalhe={ultimaFatura?.vencimento ? `vencimento ${data(ultimaFatura.vencimento)}` : "—"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Dados cadastrais">
            <dl className="space-y-3.5 text-sm">
              <Dado icon={Building2} label="Distribuidora" valor={unidade.distribuidora} />
              <Dado icon={User} label="Titular" valor={unidade.titular} />
              <Dado
                icon={MapPin}
                label="Endereço"
                valor={[unidade.endereco, unidade.cidade].filter(Boolean).join(" — ") || null}
              />
              <Dado icon={Zap} label="Classe" valor={unidade.classe} />
              <Dado
                icon={Zap}
                label="Ligação"
                valor={unidade.tipo_ligacao ? (ligacoes[unidade.tipo_ligacao] ?? null) : null}
              />
              <Dado icon={CalendarDays} label="Cadastrada em" valor={data(unidade.created_at)} />
              {unidade.observacoes && (
                <Dado icon={FileText} label="Observações" valor={unidade.observacoes} />
              )}
            </dl>
          </Panel>
          {unidade.geradora && <PainelUsina unidade={unidade} />}
        </div>

        <Panel>
          <Tabs defaultValue="consumo">
            <TabsList className="mb-5 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1 sm:w-auto">
              <TabsTrigger value="consumo">Consumo</TabsTrigger>
              <TabsTrigger value="creditos">Créditos</TabsTrigger>
              <TabsTrigger value="faturas">Faturas</TabsTrigger>
              <TabsTrigger value="rateio">Rateio</TabsTrigger>
            </TabsList>

            <TabsContent value="consumo">
              {historico.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : faturas.some((f) => f.consumo_kwh !== null) ? (
                <GraficoConsumo
                  dados={[...faturas]
                    .reverse()
                    .slice(-12)
                    .map((f) => ({ mes: f.mes_referencia, consumo: f.consumo_kwh }))}
                />
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="Sem histórico de consumo"
                  description="O consumo mensal será exibido após a importação das faturas desta unidade."
                />
              )}
            </TabsContent>

            <TabsContent value="creditos">
              <p className="mb-4 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                Os saldos de créditos não são cadastrados manualmente: são obtidos das faturas e
                atualizados mensalmente.
              </p>
              {historico.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : creditos.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="Sem histórico de créditos"
                  description="Os saldos aparecerão após a importação das faturas."
                  compact
                />
              ) : (
                <TabelaSimples
                  colunas={[
                    "Competência",
                    "Saldo anterior",
                    "Recebidos",
                    "Utilizados",
                    "Saldo atual",
                    "Validade",
                  ]}
                  linhas={creditos.map((c) => [
                    capitalizar(formatMesLongo(c.mes_referencia)),
                    kwh(c.saldo_anterior_kwh),
                    kwh(c.creditos_recebidos_kwh),
                    kwh(c.creditos_utilizados_kwh),
                    kwh(c.saldo_atual_kwh),
                    data(c.validade),
                  ])}
                  chave={creditos.map((c) => c.id)}
                />
              )}
            </TabsContent>

            <TabsContent value="faturas">
              {historico.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : faturas.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Nenhuma fatura"
                  description="As faturas importadas desta unidade aparecerão aqui."
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link to="/importar-faturas">Ir para Importar Faturas</Link>
                    </Button>
                  }
                  compact
                />
              ) : (
                <TabelaSimples
                  colunas={[
                    "Competência",
                    "Consumo",
                    "Injetada",
                    "Compensada",
                    "Valor",
                    "Vencimento",
                    "Status",
                  ]}
                  linhas={faturas.map((f) => [
                    capitalizar(formatMesLongo(f.mes_referencia)),
                    kwh(f.consumo_kwh),
                    kwh(f.energia_injetada_kwh),
                    kwh(f.energia_compensada_kwh),
                    brl(f.valor_total),
                    data(f.vencimento),
                    <StatusFatura key="s" status={f.status} />,
                  ])}
                  chave={faturas.map((f) => f.id)}
                />
              )}
            </TabsContent>

            <TabsContent value="rateio">
              {historicoRateio.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Sem histórico de rateio"
                  description="Esta unidade ainda não participou de nenhuma configuração de rateio."
                  compact
                />
              ) : (
                <TabelaSimples
                  colunas={["Vigência inicial", "Vigência final", "Percentual", "Observação"]}
                  linhas={historicoRateio.map(({ config, item }) => [
                    capitalizar(formatMesLongo(config.vigencia_inicio)),
                    config.vigencia_fim
                      ? capitalizar(formatMesLongo(config.vigencia_fim))
                      : "Em vigor",
                    <span key="p" className="font-semibold">
                      {formatPct(item.percentual)}
                    </span>,
                    config.observacoes ?? "—",
                  ])}
                  chave={historicoRateio.map((r) => r.config.id)}
                />
              )}
            </TabsContent>
          </Tabs>
        </Panel>
      </div>

      {editando && <UnidadeFormDialog unidade={unidade} onClose={() => setEditando(false)} />}
    </>
  );
}

function Indicador({
  icon: Icon,
  label,
  valor,
  detalhe,
  loading,
}: {
  icon: typeof Wallet;
  label: string;
  valor: string;
  detalhe: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-soft text-info">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p
          className={cn(
            "tabular mt-1.5 text-2xl font-bold tracking-tight",
            valor === "—" && "text-muted-foreground/50",
          )}
        >
          {valor}
        </p>
      )}
      <p className="mt-1 truncate text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}

function Dado({
  icon: Icon,
  label,
  valor,
}: {
  icon: typeof User;
  label: string;
  valor: string | null;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={cn("font-medium", !valor && "font-normal text-muted-foreground/70")}>
          {valor ?? "Não informado"}
        </dd>
      </div>
    </div>
  );
}

function PainelUsina({ unidade }: { unidade: UnidadeComRateio }) {
  const u = unidade.usina;
  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand p-5 text-white shadow-card md:p-6">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Sistema fotovoltaico</h2>
          <Sun className="h-5 w-5 text-white/80" />
        </div>
        {!u ? (
          <p className="mt-3 text-sm text-white/75">
            Dados da usina não informados. Edite o cadastro para incluí-los.
          </p>
        ) : (
          <>
            <p className="tabular mt-4 text-4xl font-bold tracking-tight">
              {u.potencia_kwp ? u.potencia_kwp.toLocaleString("pt-BR") : "—"}
              <span className="ml-1.5 text-base font-semibold text-white/70">kWp</span>
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <UsinaDado
                label="Placas"
                valor={u.quantidade_modulos ? String(u.quantidade_modulos) : null}
              />
              <UsinaDado
                label="Potência individual"
                valor={u.potencia_modulo_w ? `${u.potencia_modulo_w} W` : null}
              />
              <UsinaDado
                label="Instalação"
                valor={u.data_instalacao ? capitalizar(formatMesLongo(u.data_instalacao)) : null}
              />
              <UsinaDado label="Inversor" valor={u.inversor} icon />
            </dl>
          </>
        )}
      </div>
    </section>
  );
}

function UsinaDado({
  label,
  valor,
  icon,
}: {
  label: string;
  valor: string | null;
  icon?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.07] p-3">
      <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/60">
        {icon && <Cpu className="h-3 w-3" />} {label}
      </dt>
      <dd className="mt-0.5 font-semibold">{valor ?? "—"}</dd>
    </div>
  );
}

function StatusFatura({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paga: { label: "Paga", cls: "bg-accent text-accent-foreground" },
    pendente: { label: "Pendente", cls: "bg-info-soft text-info" },
    vencida: { label: "Vencida", cls: "bg-destructive/10 text-destructive" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge className={cn("hover:bg-inherit", s.cls)}>{s.label}</Badge>;
}

function TabelaSimples({
  colunas,
  linhas,
  chave,
}: {
  colunas: string[];
  linhas: React.ReactNode[][];
  chave: string[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table className="min-w-[620px]">
        <TableHeader>
          <TableRow>
            {colunas.map((c, i) => (
              <TableHead
                key={c}
                className={cn(i === 0 ? "pl-4" : "text-right", i === colunas.length - 1 && "pr-4")}
              >
                {c}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((l, r) => (
            <TableRow key={chave[r] ?? r}>
              {l.map((cel, i) => (
                <TableCell
                  key={i}
                  className={cn(
                    "tabular",
                    i === 0 ? "pl-4 font-medium" : "text-right",
                    i === l.length - 1 && "pr-4",
                  )}
                >
                  {cel}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GraficoConsumo({ dados }: { dados: { mes: string; consumo: number | null }[] }) {
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Consumo mensal registrado nas faturas, em kWh
      </p>
      <ChartContainer
        config={{ consumo: { label: "Consumo", color: "var(--chart-2)" } }}
        className="aspect-auto h-[280px] w-full"
      >
        <BarChart
          data={dados}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barCategoryGap="28%"
        >
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="mes"
            tickFormatter={formatMesCurto}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            tickFormatter={formatCompact}
            width={44}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded-xl border bg-card px-3 py-2 text-xs shadow-xl">
                  <p className="mb-1 font-semibold">{capitalizar(formatMesLongo(String(label)))}</p>
                  <p className="tabular">
                    <span className="text-muted-foreground">Consumo </span>
                    <span className="font-semibold">{kwh(payload[0]?.value as number)}</span>
                  </p>
                </div>
              ) : null
            }
          />
          <Bar
            dataKey="consumo"
            name="Consumo"
            fill="var(--color-consumo)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
