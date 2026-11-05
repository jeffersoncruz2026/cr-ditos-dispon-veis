import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarClock,
  Home,
  Layers,
  ShieldAlert,
  Sun,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader, Panel } from "@/components/empty-state";
import { MovimentoCreditosChart, corSerie } from "@/components/dashboard-charts";
import { BarraProgresso, KpiCard, Tendencia } from "@/components/indicadores";
import { BuscaTabela, CabecalhoOrdenavel, Paginacao, useTabela } from "@/components/tabela";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreditos, type ResumoUnidadeCredito } from "@/features/creditos/api";
import { capitalizar, formatKwh, formatMesCurto, formatMesLongo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/creditos")({
  head: () => ({ meta: [{ title: "Gestão de Créditos — SolarGest" }] }),
  component: Page,
});

const sumOrNull = (v: (number | null | undefined)[]) => {
  const n = v.filter((x): x is number => typeof x === "number");
  return n.length ? n.reduce((a, b) => a + b, 0) : null;
};
const kwhOuNulo = (v: number | null | undefined) => (typeof v === "number" ? formatKwh(v) : null);
const dataBR = (iso: string | null) =>
  iso ? iso.slice(0, 10).split("-").reverse().join("/") : null;

function Page() {
  const { data, isLoading, isError } = useCreditos();

  const resumo = useMemo(() => {
    if (!data) return null;
    const ultimoMes = data.meses.at(-1) ?? null;
    const penultimo = data.meses.at(-2) ?? null;
    const doMes = (m: string | null) => data.registros.filter((r) => r.mes === m);
    const saldoAte = (m: string) => {
      const ult = new Map<string, number | null>();
      for (const u of data.unidades) {
        const r = data.registros
          .filter((x) => x.unidade_id === u.id && x.mes <= m)
          .sort((a, b) => b.mes.localeCompare(a.mes))[0];
        if (r) ult.set(u.id, r.saldo_atual);
      }
      return sumOrNull([...ult.values()]);
    };
    const expirar = data.unidades.filter((u) => typeof u.aExpirar?.kwh === "number");
    const proximaData =
      expirar
        .map((u) => u.aExpirar?.data)
        .filter((d): d is string => !!d)
        .sort()[0] ?? null;
    return {
      ultimoMes,
      penultimo,
      saldo: sumOrNull(data.unidades.map((u) => u.ultimo?.saldo_atual)),
      saldoAnterior: penultimo ? saldoAte(penultimo) : null,
      recebidos: sumOrNull(doMes(ultimoMes).map((r) => r.recebidos)),
      recebidosAnt: sumOrNull(doMes(penultimo).map((r) => r.recebidos)),
      utilizados: sumOrNull(doMes(ultimoMes).map((r) => r.utilizados)),
      utilizadosAnt: sumOrNull(doMes(penultimo).map((r) => r.utilizados)),
      aExpirar: sumOrNull(expirar.map((u) => u.aExpirar?.kwh)),
      proximaData,
      serie: data.meses.slice(-12).map((m) => ({
        mes: m,
        recebidos: sumOrNull(doMes(m).map((r) => r.recebidos)),
        utilizados: sumOrNull(doMes(m).map((r) => r.utilizados)),
        saldo: saldoAte(m),
      })),
    };
  }, [data]);

  const rotuloAnt = resumo?.penultimo ? `vs ${formatMesCurto(resumo.penultimo)}` : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Gestão energética"
        title="Gestão de Créditos"
        description="Saldo, movimentação e validade dos créditos de energia de cada unidade consumidora."
      >
        {resumo?.ultimoMes && (
          <span className="rounded-lg border bg-card px-3 py-1.5 text-sm shadow-card">
            <span className="text-muted-foreground">Último registro: </span>
            <span className="font-semibold">{capitalizar(formatMesLongo(resumo.ultimoMes))}</span>
          </span>
        )}
      </PageHeader>

      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Não foi possível carregar os créditos. Tente novamente em instantes.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          tom="esmeralda"
          titulo="Saldo consolidado"
          ajuda="Soma do saldo atual mais recente de cada unidade."
          loading={isLoading}
          valor={kwhOuNulo(resumo?.saldo)}
          unidade="kWh"
          rodape={
            resumo?.saldo == null ? (
              <span className="text-muted-foreground">Aguardando registros</span>
            ) : (
              <Tendencia atual={resumo.saldo} anterior={resumo.saldoAnterior} rotulo={rotuloAnt} />
            )
          }
        />
        <KpiCard
          icon={ArrowDownToLine}
          tom="azul"
          titulo="Créditos recebidos"
          ajuda="Créditos recebidos pelas unidades no último mês registrado."
          loading={isLoading}
          valor={kwhOuNulo(resumo?.recebidos)}
          unidade="kWh"
          rodape={
            resumo?.recebidos == null ? (
              <span className="text-muted-foreground">Sem registro no mês</span>
            ) : (
              <Tendencia
                atual={resumo.recebidos}
                anterior={resumo.recebidosAnt}
                rotulo={rotuloAnt}
              />
            )
          }
        />
        <KpiCard
          icon={ArrowUpFromLine}
          tom="azul"
          titulo="Créditos utilizados"
          ajuda="Créditos consumidos pelas unidades no último mês registrado, conforme informado."
          loading={isLoading}
          valor={kwhOuNulo(resumo?.utilizados)}
          unidade="kWh"
          rodape={
            resumo?.utilizados == null ? (
              <span className="text-muted-foreground">Não informado</span>
            ) : (
              <Tendencia
                atual={resumo.utilizados}
                anterior={resumo.utilizadosAnt}
                melhorQuandoSobe={false}
                rotulo={rotuloAnt}
              />
            )
          }
        />
        <KpiCard
          icon={CalendarClock}
          tom="solar"
          titulo="Próximos do vencimento"
          ajuda="Créditos a expirar informados na fatura mais recente de cada unidade."
          loading={isLoading}
          valor={kwhOuNulo(resumo?.aExpirar)}
          unidade="kWh"
          rodape={
            <span className="text-muted-foreground">
              {resumo?.proximaData
                ? `Vencimento a partir de ${dataBR(resumo.proximaData)}`
                : "Sem vencimento informado"}
            </span>
          }
        />
      </div>

      <div className="mt-5 grid gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <Panel title="Saldo por unidade" description="Último saldo registrado de cada unidade">
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : !data?.unidades.length ? (
            <EmptyState
              icon={Home}
              title="Nenhuma unidade cadastrada"
              description="Cadastre as unidades para acompanhar os créditos."
              compact
            />
          ) : (
            <SaldoPorUnidade unidades={data.unidades} total={resumo?.saldo ?? null} />
          )}
        </Panel>
        <Panel
          title="Evolução dos créditos"
          description="Movimentação mensal e saldo consolidado, em kWh"
        >
          {isLoading ? (
            <Skeleton className="h-[290px] w-full rounded-lg" />
          ) : !resumo?.serie.length ? (
            <EmptyState
              icon={Layers}
              title="Nenhum dado disponível"
              description="A evolução aparecerá quando houver créditos registrados."
              className="min-h-[290px]"
              compact
            />
          ) : (
            <MovimentoCreditosChart data={resumo.serie} />
          )}
        </Panel>
      </div>

      <Panel
        className="mt-5"
        title="Extrato de créditos"
        description="Movimentação registrada por competência e unidade"
      >
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-lg" />
        ) : !data?.registros.length ? (
          <EmptyState
            icon={Wallet}
            title="Nenhum crédito registrado"
            description="Os saldos mensais — anterior, recebido, utilizado e atual — aparecem aqui após a importação das faturas."
            action={
              <Link
                to="/importar-faturas"
                className="text-sm font-medium text-primary hover:underline"
              >
                Importar faturas
              </Link>
            }
          />
        ) : (
          <Extrato dados={data} />
        )}
      </Panel>
    </>
  );
}

function SaldoPorUnidade({
  unidades,
  total,
}: {
  unidades: ResumoUnidadeCredito[];
  total: number | null;
}) {
  const max = Math.max(0, ...unidades.map((u) => u.ultimo?.saldo_atual ?? 0));
  return (
    <ul className="space-y-3">
      {unidades.map((u) => {
        const saldo = u.ultimo?.saldo_atual ?? null;
        const semCreditos = !saldo;
        // "Saldo elevado": maior saldo entre as unidades e ao menos 40% do consolidado.
        const elevado = !!saldo && saldo === max && !!total && saldo / total >= 0.4;
        return (
          <li
            key={u.id}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              elevado && "border-success/40 bg-accent/40",
              semCreditos && "border-dashed",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  u.geradora ? "bg-solar/15 text-solar-foreground" : "bg-info-soft text-info",
                )}
              >
                {u.geradora ? <Sun className="h-4 w-4" /> : <Home className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{u.nome}</p>
                  {elevado && (
                    <span className="shrink-0 rounded-md bg-accent px-1.5 py-0.5 text-[10.5px] font-semibold text-accent-foreground">
                      Saldo elevado
                    </span>
                  )}
                  {semCreditos && (
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                      Sem créditos
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {u.ultimo ? `Registro de ${formatMesCurto(u.ultimo.mes)}` : "Nenhum registro"}
                  {typeof u.aExpirar?.kwh === "number" && u.aExpirar.kwh > 0
                    ? ` · ${formatKwh(u.aExpirar.kwh)} kWh a expirar`
                    : ""}
                </p>
              </div>
              <p className="tabular shrink-0 text-right text-sm font-bold">
                {saldo === null ? (
                  <span className="font-normal text-muted-foreground">—</span>
                ) : (
                  <>
                    {formatKwh(saldo)}
                    <span className="ml-1 text-xs font-medium text-muted-foreground">kWh</span>
                  </>
                )}
              </p>
            </div>
            <BarraProgresso
              className="mt-2.5"
              valor={max > 0 && saldo ? (saldo / max) * 100 : 0}
              cor={corSerie(u.indice)}
            />
          </li>
        );
      })}
    </ul>
  );
}

function Extrato({ dados }: { dados: NonNullable<ReturnType<typeof useCreditos>["data"]> }) {
  const [busca, setBusca] = useState("");
  const [unidade, setUnidade] = useState("todas");
  const nome = (id: string) => dados.unidades.find((u) => u.id === id)?.nome ?? "Unidade removida";
  const linhas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return dados.registros.filter(
      (r) =>
        (unidade === "todas" || r.unidade_id === unidade) &&
        (!q || nome(r.unidade_id).toLowerCase().includes(q) || formatMesLongo(r.mes).includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, busca, unidade]);
  const t = useTabela(linhas, {
    valores: {
      mes: (r) => r.mes,
      unidade: (r) => nome(r.unidade_id),
      anterior: (r) => r.saldo_anterior,
      recebidos: (r) => r.recebidos,
      utilizados: (r) => r.utilizados,
      atual: (r) => r.saldo_atual,
      validade: (r) => r.validade,
    },
    ordemInicial: { chave: "mes", direcao: "desc" },
  });
  const num = (v: number | null) =>
    v === null ? <span className="text-muted-foreground">—</span> : formatKwh(v);

  return (
    <>
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row">
        <BuscaTabela
          className="flex-1"
          valor={busca}
          onChange={setBusca}
          placeholder="Buscar por unidade ou mês"
        />
        <Select value={unidade} onValueChange={setUnidade}>
          <SelectTrigger className="h-9 sm:w-[220px]" aria-label="Filtrar por unidade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as unidades</SelectItem>
            {dados.unidades.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <CabecalhoOrdenavel
                chave="mes"
                ordem={t.ordem}
                onOrdenar={t.alternar}
                className="pl-4"
              >
                Competência
              </CabecalhoOrdenavel>
              <CabecalhoOrdenavel chave="unidade" ordem={t.ordem} onOrdenar={t.alternar}>
                Unidade
              </CabecalhoOrdenavel>
              <CabecalhoOrdenavel
                chave="anterior"
                ordem={t.ordem}
                onOrdenar={t.alternar}
                alinhar="direita"
              >
                Saldo anterior
              </CabecalhoOrdenavel>
              <CabecalhoOrdenavel
                chave="recebidos"
                ordem={t.ordem}
                onOrdenar={t.alternar}
                alinhar="direita"
              >
                Recebidos
              </CabecalhoOrdenavel>
              <CabecalhoOrdenavel
                chave="utilizados"
                ordem={t.ordem}
                onOrdenar={t.alternar}
                alinhar="direita"
              >
                Utilizados
              </CabecalhoOrdenavel>
              <CabecalhoOrdenavel
                chave="atual"
                ordem={t.ordem}
                onOrdenar={t.alternar}
                alinhar="direita"
              >
                Saldo atual
              </CabecalhoOrdenavel>
              <CabecalhoOrdenavel
                chave="validade"
                ordem={t.ordem}
                onOrdenar={t.alternar}
                className="pr-4"
              >
                Validade
              </CabecalhoOrdenavel>
            </TableRow>
          </TableHeader>
          <TableBody>
            {t.visiveis.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pl-4 font-medium">
                  {capitalizar(formatMesCurto(r.mes))}
                </TableCell>
                <TableCell>{nome(r.unidade_id)}</TableCell>
                <TableCell className="tabular text-right">{num(r.saldo_anterior)}</TableCell>
                <TableCell className="tabular text-right text-accent-foreground">
                  {num(r.recebidos)}
                </TableCell>
                <TableCell className="tabular text-right">{num(r.utilizados)}</TableCell>
                <TableCell className="tabular text-right font-semibold">
                  {num(r.saldo_atual)}
                </TableCell>
                <TableCell className="tabular pr-4 text-muted-foreground">
                  {dataBR(r.validade) ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Paginacao
          pagina={t.pagina}
          totalPaginas={t.totalPaginas}
          total={t.total}
          porPagina={t.porPagina}
          onPagina={t.setPagina}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Valores de energia em kWh.</p>
    </>
  );
}
