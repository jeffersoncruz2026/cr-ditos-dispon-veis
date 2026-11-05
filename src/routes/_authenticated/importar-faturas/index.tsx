import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  CloudUpload,
  Copy,
  Eye,
  FileCode2,
  FileText,
  History,
  Loader2,
  MoreHorizontal,
  ScanSearch,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, Panel } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrentAccess } from "@/hooks/use-access";
import { BuscaTabela, CabecalhoOrdenavel, Paginacao, useTabela } from "@/components/tabela";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { capitalizar, formatBRL, formatKwh, formatMesLongo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  faturasKeys,
  processarArquivo,
  useCompetencias,
  useDescartar,
  useImportacoes,
  useUnidadesRef,
  type ResultadoArquivo,
} from "@/features/faturas/api";
import {
  listaAvisos,
  MetodoBadge,
  ResumoAvisos,
  StatusImportacao,
  tamanhoArquivo,
} from "@/features/faturas/shared";

export const Route = createFileRoute("/_authenticated/importar-faturas/")({
  head: () => ({ meta: [{ title: "Importar Faturas — SolarGest" }] }),
  component: ImportarFaturas,
});

type ItemFila = { chave: string; nome: string; tamanho: number; resultado: ResultadoArquivo };

const ETAPAS: Record<ResultadoArquivo["etapa"], string> = {
  verificando: "Verificando duplicidade",
  enviando: "Enviando para armazenamento privado",
  lendo: "Lendo o XML da nota fiscal",
  extraindo: "Extraindo dados",
  concluido: "Pronto para conferência",
  duplicado: "Duplicado",
  erro: "Erro",
};

function ImportarFaturas() {
  const { canWrite } = useCurrentAccess();
  const qc = useQueryClient();
  const unidades = useUnidadesRef();
  const importacoes = useImportacoes();
  const competencias = useCompetencias();
  const descartar = useDescartar();
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [processando, setProcessando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [removendo, setRemovendo] = useState<{
    id: string;
    fatura_id: string | null;
    nome: string;
  } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const nomeUnidade = (id: string | null) => unidades.data?.find((u) => u.id === id)?.nome ?? null;

  // Histórico: busca, filtro de status, ordenação e paginação (apenas apresentação).
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const historicoFiltrado = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (importacoes.data ?? []).filter(
      (i) =>
        (filtroStatus === "todos" || i.status === filtroStatus) &&
        (!q ||
          i.arquivo_nome.toLowerCase().includes(q) ||
          (nomeUnidade(i.unidade_id) ?? "").toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importacoes.data, busca, filtroStatus, unidades.data]);
  const tabela = useTabela(historicoFiltrado, {
    valores: {
      arquivo: (i) => i.arquivo_nome,
      enviado: (i) => i.created_at,
      unidade: (i) => nomeUnidade(i.unidade_id),
      competencia: (i) => i.mes_referencia,
      status: (i) => i.status,
    },
    ordemInicial: { chave: "enviado", direcao: "desc" },
  });

  async function receber(files: FileList | File[]) {
    const lista = [...files];
    if (!lista.length || !unidades.data) return;
    const novos: ItemFila[] = lista.map((f, i) => ({
      chave: `${Date.now()}-${i}-${f.name}`,
      nome: f.name,
      tamanho: f.size,
      resultado: { etapa: "verificando" },
    }));
    setFila((f) => [...novos, ...f]);
    setProcessando(true);
    for (let i = 0; i < lista.length; i++) {
      const chave = novos[i]!.chave;
      const atualizar = (r: ResultadoArquivo) =>
        setFila((f) => f.map((x) => (x.chave === chave ? { ...x, resultado: r } : x)));
      const r = await processarArquivo(lista[i]!, unidades.data, atualizar);
      atualizar(r);
      qc.invalidateQueries({ queryKey: faturasKeys.importacoes() });
    }
    setProcessando(false);
    if (input.current) input.current.value = "";
  }

  const pendentes = (importacoes.data ?? []).filter((i) =>
    ["aguardando_conferencia", "processando", "erro"].includes(i.status),
  );

  return (
    <>
      <PageHeader
        eyebrow="Gestão energética"
        title="Importar Faturas"
        description="Envie o XML da nota fiscal de energia (NF3e) das faturas mensais da Equatorial Goiás. Os dados são lidos diretamente do XML e só entram no sistema após a sua conferência."
      >
        <div className="flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm shadow-card">
          <FileCode2 className="h-4 w-4 text-success" />
          <span>
            Leitura do <span className="font-semibold">XML NF3e</span>
          </span>
        </div>
      </PageHeader>

      {canWrite && (
        <Panel className="mb-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              if (!processando) void receber(e.dataTransfer.files);
            }}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
              arrastando ? "border-success bg-accent/40" : "border-border bg-muted/30",
            )}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-accent-foreground shadow-card ring-1 ring-border">
              <CloudUpload className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold">Arraste os XMLs das faturas (NF3e) para cá</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Um ou vários de uma vez · até 5 MB cada · armazenados em ambiente privado. A unidade é
              identificada pelo número da UC.
            </p>
            <Button
              className="mt-5"
              disabled={processando || !unidades.data}
              onClick={() => input.current?.click()}
            >
              {processando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {processando ? "Processando…" : "Selecionar XMLs"}
            </Button>
            <input
              ref={input}
              type="file"
              accept=".xml,text/xml,application/xml"
              multiple
              className="hidden"
              aria-label="Selecionar XMLs das faturas"
              onChange={(e) => e.target.files && void receber(e.target.files)}
            />
          </div>

          {fila.length > 0 && (
            <ul className="mt-5 divide-y rounded-xl border">
              {fila.map((item) => (
                <ItemProcessamento key={item.chave} item={item} />
              ))}
            </ul>
          )}
        </Panel>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Panel
          title="Aguardando conferência"
          description="Confira os dados extraídos antes de confirmar a importação."
          action={<ScanSearch className="h-4 w-4 text-muted-foreground" />}
        >
          {importacoes.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : pendentes.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nenhuma fatura pendente"
              description="As faturas enviadas aparecerão aqui para conferência."
              compact
            />
          ) : (
            <ul className="space-y-2.5">
              {pendentes.map((i) => (
                <li key={i.id}>
                  <Link
                    to="/importar-faturas/$importacaoId"
                    params={{ importacaoId: i.id }}
                    className="flex items-center gap-3 rounded-xl border p-3.5 transition hover:border-success/40 hover:shadow-card"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
                      <FileCode2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{i.arquivo_nome}</p>
                        <MetodoBadge metodo={i.metodo_extracao} arquivo={i.arquivo_nome} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {nomeUnidade(i.unidade_id) ?? "Unidade não identificada"} ·{" "}
                        {i.mes_referencia
                          ? formatMesLongo(i.mes_referencia)
                          : "competência não identificada"}
                      </p>
                      <div className="mt-1">
                        {i.status === "aguardando_conferencia" ? (
                          <ResumoAvisos avisos={listaAvisos(i.avisos)} />
                        ) : (
                          <StatusImportacao status={i.status} />
                        )}
                      </div>
                    </div>
                    <span className="hidden text-xs font-semibold text-primary sm:inline">
                      Conferir →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Histórico de competências"
          description="Faturas importadas por mês de referência e unidade."
          action={<CalendarRange className="h-4 w-4 text-muted-foreground" />}
        >
          <MatrizCompetencias
            loading={competencias.isLoading || unidades.isLoading}
            faturas={competencias.data ?? []}
            unidades={unidades.data ?? []}
          />
        </Panel>
      </div>

      <Panel
        className="mt-6"
        title="Histórico de importações"
        description="Todos os arquivos enviados, com o resultado de cada importação."
        action={<History className="h-4 w-4 text-muted-foreground" />}
      >
        {importacoes.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !importacoes.data?.length ? (
          <EmptyState
            icon={History}
            title="Nenhuma importação"
            description="O histórico de arquivos enviados aparecerá aqui."
            compact
          />
        ) : (
          <>
            <div className="mb-3 flex flex-col gap-2.5 sm:flex-row">
              <BuscaTabela
                className="flex-1"
                valor={busca}
                onChange={setBusca}
                placeholder="Buscar por arquivo ou unidade"
              />
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-9 sm:w-[210px]" aria-label="Filtrar por status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="aguardando_conferencia">Aguardando conferência</SelectItem>
                  <SelectItem value="importada">Importadas</SelectItem>
                  <SelectItem value="erro">Com erro</SelectItem>
                  <SelectItem value="descartada">Descartadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tabela.total === 0 ? (
              <EmptyState
                icon={History}
                title="Nenhuma importação encontrada"
                description="Ajuste a busca ou o filtro de status."
                compact
              />
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table className="min-w-[820px]">
                  <TableHeader>
                    <TableRow>
                      <CabecalhoOrdenavel
                        chave="arquivo"
                        ordem={tabela.ordem}
                        onOrdenar={tabela.alternar}
                        className="pl-4"
                      >
                        Arquivo
                      </CabecalhoOrdenavel>
                      <CabecalhoOrdenavel
                        chave="enviado"
                        ordem={tabela.ordem}
                        onOrdenar={tabela.alternar}
                      >
                        Enviado em
                      </CabecalhoOrdenavel>
                      <CabecalhoOrdenavel
                        chave="unidade"
                        ordem={tabela.ordem}
                        onOrdenar={tabela.alternar}
                      >
                        Unidade
                      </CabecalhoOrdenavel>
                      <CabecalhoOrdenavel
                        chave="competencia"
                        ordem={tabela.ordem}
                        onOrdenar={tabela.alternar}
                      >
                        Competência
                      </CabecalhoOrdenavel>
                      <CabecalhoOrdenavel
                        chave="status"
                        ordem={tabela.ordem}
                        onOrdenar={tabela.alternar}
                      >
                        Status
                      </CabecalhoOrdenavel>
                      <TableHead className="w-12 pr-4">
                        <span className="sr-only">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tabela.visiveis.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <p className="max-w-[260px] truncate font-medium">{i.arquivo_nome}</p>
                            <MetodoBadge metodo={i.metodo_extracao} arquivo={i.arquivo_nome} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {tamanhoArquivo(i.arquivo_tamanho)}
                          </p>
                        </TableCell>
                        <TableCell className="tabular text-muted-foreground">
                          {new Date(i.created_at).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </TableCell>
                        <TableCell>
                          {nomeUnidade(i.unidade_id) ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {i.mes_referencia ? (
                            capitalizar(formatMesLongo(i.mes_referencia))
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusImportacao status={i.status} />
                        </TableCell>
                        <TableCell className="pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Ações de ${i.arquivo_nome}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  to="/importar-faturas/$importacaoId"
                                  params={{ importacaoId: i.id }}
                                >
                                  <Eye className="h-4 w-4" />
                                  {i.status === "aguardando_conferencia"
                                    ? "Conferir"
                                    : "Ver detalhes"}
                                </Link>
                              </DropdownMenuItem>
                              {canWrite && i.status !== "descartada" && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() =>
                                    setRemovendo({
                                      id: i.id,
                                      fatura_id: i.fatura_id,
                                      nome: i.arquivo_nome,
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {i.status === "importada"
                                    ? "Excluir fatura importada"
                                    : "Descartar"}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Paginacao
                  pagina={tabela.pagina}
                  totalPaginas={tabela.totalPaginas}
                  total={tabela.total}
                  porPagina={tabela.porPagina}
                  onPagina={tabela.setPagina}
                />
              </div>
            )}
          </>
        )}
      </Panel>

      <AlertDialog open={!!removendo} onOpenChange={(o) => !o && setRemovendo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removendo?.fatura_id ? "Excluir a fatura importada?" : "Descartar esta importação?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removendo?.fatura_id
                ? `A fatura de “${removendo.nome}” e os créditos dessa competência serão removidos do sistema. O arquivo poderá ser importado novamente.`
                : `“${removendo?.nome}” sairá da fila de conferência. O arquivo poderá ser enviado novamente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (!removendo) return;
                descartar.mutate(removendo, {
                  onSuccess: () => {
                    toast.success(
                      removendo.fatura_id ? "Fatura excluída." : "Importação descartada.",
                    );
                    setRemovendo(null);
                  },
                  onError: () => toast.error("Não foi possível concluir a operação."),
                });
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ItemProcessamento({ item }: { item: ItemFila }) {
  const r = item.resultado;
  const final = ["concluido", "duplicado", "erro"].includes(r.etapa);
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          r.etapa === "erro"
            ? "bg-destructive/10 text-destructive"
            : r.etapa === "duplicado"
              ? "bg-warning/15 text-warning-foreground"
              : r.etapa === "concluido"
                ? "bg-accent text-accent-foreground"
                : "bg-info-soft text-info",
        )}
      >
        {r.etapa === "erro" ? (
          <XCircle className="h-4 w-4" />
        ) : r.etapa === "duplicado" ? (
          <Copy className="h-4 w-4" />
        ) : r.etapa === "concluido" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.nome}</p>
        <p className="truncate text-xs text-muted-foreground">
          {r.mensagem ?? ETAPAS[r.etapa]}
          {r.etapa === "concluido" && r.metodo === "basica" && " · extração básica"}
          {r.etapa === "concluido" && r.metodo === "xml" && " · lido do XML"}
        </p>
      </div>
      {final && r.importacaoId && r.etapa !== "erro" && (
        <Button asChild size="sm" variant={r.etapa === "concluido" ? "default" : "outline"}>
          <Link to="/importar-faturas/$importacaoId" params={{ importacaoId: r.importacaoId }}>
            {r.etapa === "concluido" ? "Conferir" : "Abrir"}
          </Link>
        </Button>
      )}
    </li>
  );
}

function MatrizCompetencias({
  loading,
  faturas,
  unidades,
}: {
  loading: boolean;
  faturas: {
    id: string;
    unidade_id: string;
    mes_referencia: string;
    valor_total: number | null;
    consumo_kwh: number | null;
  }[];
  unidades: { id: string; nome: string }[];
}) {
  if (loading) return <Skeleton className="h-40 w-full" />;
  if (!faturas.length)
    return (
      <EmptyState
        icon={CalendarRange}
        title="Nenhuma competência importada"
        description="Cada mês importado aparecerá aqui, com a situação de cada unidade."
        compact
      />
    );
  const meses = [...new Set(faturas.map((f) => f.mes_referencia.slice(0, 7)))].sort().reverse();
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table className="min-w-[520px]">
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Competência</TableHead>
            {unidades.map((u) => (
              <TableHead key={u.id} className="text-center">
                {u.nome.replace(/^Casa\s+/i, "")}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {meses.map((m) => {
            const doMes = faturas.filter((f) => f.mes_referencia.startsWith(m));
            return (
              <TableRow key={m}>
                <TableCell className="pl-4 font-medium">
                  {capitalizar(formatMesLongo(`${m}-01`))}
                  <p className="text-xs font-normal text-muted-foreground">
                    {doMes.length} de {unidades.length} unidades
                  </p>
                </TableCell>
                {unidades.map((u) => {
                  const f = doMes.find((x) => x.unidade_id === u.id);
                  return (
                    <TableCell key={u.id} className="text-center">
                      {f ? (
                        <Link
                          to="/unidades/$unidadeId"
                          params={{ unidadeId: u.id }}
                          className="inline-flex flex-col items-center rounded-lg px-2 py-1 hover:bg-muted"
                          title={
                            f.consumo_kwh !== null ? `${formatKwh(f.consumo_kwh)} kWh` : undefined
                          }
                        >
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span className="tabular text-[11px] text-muted-foreground">
                            {f.valor_total !== null ? formatBRL(f.valor_total) : "—"}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">Pendente</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
