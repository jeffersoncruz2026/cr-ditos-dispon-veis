import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Eye,
  History,
  Home,
  MoreHorizontal,
  Pencil,
  PieChart,
  Plus,
  Search,
  ShieldAlert,
  Sun,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, Panel } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuSeparator,
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
import { capitalizar, formatMesLongo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  mensagemErro,
  useExcluirUnidade,
  useUnidades,
  type RateioConfiguracao,
  type UnidadeComRateio,
} from "@/features/unidades/api";
import {
  corDaUnidade,
  formatPct,
  SituacaoBadge,
  situacoes,
  TipoBadge,
  UnidadeIcon,
} from "@/features/unidades/shared";
import { UnidadeFormDialog } from "@/features/unidades/unidade-form-dialog";
import { RateioDialog } from "@/features/unidades/rateio-dialog";

export const Route = createFileRoute("/_authenticated/unidades/")({
  head: () => ({ meta: [{ title: "Unidades Consumidoras — SolarGest" }] }),
  component: UnidadesPage,
});

function UnidadesPage() {
  const { canWrite } = useCurrentAccess();
  const navigate = useNavigate();
  const { data, vigente, programada, ultima, rateios, isLoading, isError, error } = useUnidades();
  const [editando, setEditando] = useState<UnidadeComRateio | "nova" | null>(null);
  const [excluindo, setExcluindo] = useState<UnidadeComRateio | null>(null);
  const [rateioAberto, setRateioAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [situacao, setSituacao] = useState("todas");
  const excluir = useExcluirUnidade();

  const unidades = data ?? [];
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return unidades.filter(
      (u) =>
        (!q ||
          u.nome.toLowerCase().includes(q) ||
          u.numero_uc.includes(q.replace(/\D/g, "") || q)) &&
        (tipo === "todos" || (tipo === "geradora") === u.geradora) &&
        (situacao === "todas" || u.situacao === situacao),
    );
  }, [unidades, busca, tipo, situacao]);

  const somaVigente = vigente ? vigente.itens.reduce((a, i) => a + i.percentual, 0) : null;
  const rateioValido = somaVigente !== null && Math.round(somaVigente * 100) === 10000;
  const usina = unidades.find((u) => u.usina)?.usina ?? null;
  const aguardando = unidades.filter((u) => u.situacao === "aguardando_rateio").length;

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Unidades Consumidoras"
        description="Cadastro das unidades que participam do sistema de compensação de energia e da distribuição dos créditos."
      >
        {canWrite && (
          <>
            <Button
              variant="outline"
              onClick={() => setRateioAberto(true)}
              disabled={!unidades.length}
            >
              <PieChart className="h-4 w-4" /> Alterar rateio
            </Button>
            <Button onClick={() => setEditando("nova")}>
              <Plus className="h-4 w-4" /> Nova unidade
            </Button>
          </>
        )}
      </PageHeader>

      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {mensagemErro(error, "Não foi possível carregar as unidades consumidoras.")}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Resumo
          loading={isLoading}
          icon={Home}
          label="Unidades cadastradas"
          valor={String(unidades.length)}
          detalhe={`${unidades.filter((u) => u.situacao !== "inativa").length} participantes da compensação`}
        />
        <Resumo
          loading={isLoading}
          icon={PieChart}
          label="Rateio vigente"
          valor={somaVigente === null ? "—" : formatPct(somaVigente)}
          detalhe={
            vigente ? `desde ${formatMesLongo(vigente.vigencia_inicio)}` : "Nenhum rateio vigente"
          }
          tom={somaVigente === null ? undefined : rateioValido ? "ok" : "erro"}
        />
        <Resumo
          loading={isLoading}
          icon={Sun}
          label="Potência instalada"
          valor={usina?.potencia_kwp ? `${usina.potencia_kwp.toLocaleString("pt-BR")} kWp` : "—"}
          detalhe={
            usina?.quantidade_modulos
              ? `${usina.quantidade_modulos} placas${usina.potencia_modulo_w ? ` de ${usina.potencia_modulo_w} W` : ""}`
              : "Usina não cadastrada"
          }
        />
        <Resumo
          loading={isLoading}
          icon={CalendarClock}
          label="Aguardando inclusão"
          valor={String(aguardando)}
          detalhe={aguardando ? "unidade(s) fora do rateio" : "Todas incluídas"}
          tom={aguardando ? "atencao" : undefined}
        />
      </div>

      <Panel
        title="Unidades"
        description="Clique em uma unidade para ver detalhes e histórico."
        action={
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {filtradas.length} de {unidades.length}
          </span>
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou número da UC"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="sm:w-[170px]" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="geradora">Geradora</SelectItem>
              <SelectItem value="recebedora">Recebedora</SelectItem>
            </SelectContent>
          </Select>
          <Select value={situacao} onValueChange={setSituacao}>
            <SelectTrigger className="sm:w-[230px]" aria-label="Filtrar por situação">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as situações</SelectItem>
              {Object.entries(situacoes).map(([v, s]) => (
                <SelectItem key={v} value={v}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : unidades.length === 0 ? (
          <EmptyState
            icon={Home}
            title="Nenhuma unidade cadastrada"
            description="Cadastre as unidades consumidoras para acompanhar consumo, créditos e rateio."
            action={
              canWrite && (
                <Button onClick={() => setEditando("nova")}>
                  <Plus className="h-4 w-4" /> Cadastrar unidade
                </Button>
              )
            }
          />
        ) : filtradas.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhuma unidade encontrada"
            description="Ajuste a busca ou os filtros."
            compact
          />
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="pl-4">Unidade</TableHead>
                  <TableHead>UC</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Distribuidora</TableHead>
                  <TableHead className="w-[180px]">Rateio vigente</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-12 pr-4">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((u) => (
                  <TableRow
                    key={u.id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({ to: "/unidades/$unidadeId", params: { unidadeId: u.id } })
                    }
                  >
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <UnidadeIcon geradora={u.geradora} className="h-9 w-9" />
                        <div className="min-w-0">
                          <Link
                            to="/unidades/$unidadeId"
                            params={{ unidadeId: u.id }}
                            className="font-semibold hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {u.nome}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.usina?.potencia_kwp
                              ? `Usina de ${u.usina.potencia_kwp.toLocaleString("pt-BR")} kWp`
                              : (u.titular ?? u.cidade ?? "—")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular font-medium">{u.numero_uc}</TableCell>
                    <TableCell>
                      <TipoBadge geradora={u.geradora} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.distribuidora}</TableCell>
                    <TableCell>
                      {u.percentual === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="tabular w-12 font-semibold">
                            {formatPct(u.percentual)}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(u.percentual, 100)}%`,
                                background: corDaUnidade(unidades.indexOf(u)),
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <SituacaoBadge situacao={u.situacao} />
                    </TableCell>
                    <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Ações de ${u.nome}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to="/unidades/$unidadeId" params={{ unidadeId: u.id }}>
                              <Eye className="h-4 w-4" /> Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          {canWrite && (
                            <>
                              <DropdownMenuItem onSelect={() => setEditando(u)}>
                                <Pencil className="h-4 w-4" /> Editar cadastro
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setExcluindo(u)}
                              >
                                <Trash2 className="h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel
          title="Distribuição vigente"
          description={
            vigente
              ? `Em vigor desde ${formatMesLongo(vigente.vigencia_inicio)}`
              : "Nenhuma configuração em vigor"
          }
          action={
            canWrite && unidades.length > 0 ? (
              <Button size="sm" variant="outline" onClick={() => setRateioAberto(true)}>
                <Pencil className="h-3.5 w-3.5" /> Alterar
              </Button>
            ) : undefined
          }
        >
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !vigente ? (
            <EmptyState
              icon={PieChart}
              title="Rateio não definido"
              description="Defina os percentuais de distribuição dos créditos entre as unidades."
              compact
            />
          ) : (
            <DistribuicaoVigente config={vigente} unidades={unidades} valido={rateioValido} />
          )}
          {programada && (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-primary/[0.05] px-3 py-2 text-xs text-primary">
              <CalendarClock className="h-3.5 w-3.5" /> Nova configuração programada a partir de{" "}
              {formatMesLongo(programada.vigencia_inicio)}.
            </p>
          )}
        </Panel>

        <Panel
          title="Histórico de rateio"
          description="Configurações de distribuição e seus períodos de vigência."
          action={<History className="h-4 w-4 text-muted-foreground" />}
        >
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : rateios.length === 0 ? (
            <EmptyState
              icon={History}
              title="Sem histórico"
              description="As alterações de rateio aparecerão aqui."
              compact
            />
          ) : (
            <HistoricoRateio rateios={rateios} unidades={unidades} />
          )}
        </Panel>
      </div>

      {editando && (
        <UnidadeFormDialog
          unidade={editando === "nova" ? null : editando}
          onClose={() => setEditando(null)}
        />
      )}
      {rateioAberto && (
        <RateioDialog unidades={unidades} ultima={ultima} onClose={() => setRateioAberto(false)} />
      )}

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{excluindo?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Faturas, créditos, usina e histórico de rateio desta unidade também serão excluídos, e
              o rateio vigente deixará de somar 100% caso ela tenha percentual. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={excluir.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!excluindo) return;
                excluir.mutate(excluindo.id, {
                  onSuccess: () => {
                    toast.success("Unidade excluída.");
                    setExcluindo(null);
                  },
                  onError: (er) => toast.error(mensagemErro(er, "Não foi possível excluir.")),
                });
              }}
            >
              Excluir unidade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Resumo({
  icon: Icon,
  label,
  valor,
  detalhe,
  loading,
  tom,
}: {
  icon: typeof Home;
  label: string;
  valor: string;
  detalhe: string;
  loading: boolean;
  tom?: "ok" | "erro" | "atencao" | undefined;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            tom === "erro"
              ? "bg-destructive/10 text-destructive"
              : tom === "atencao"
                ? "bg-warning/15 text-warning-foreground"
                : tom === "ok"
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary/[0.07] text-primary",
          )}
        >
          {tom === "erro" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : tom === "ok" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className="tabular mt-1.5 text-2xl font-extrabold tracking-tight">{valor}</p>
      )}
      <p className="mt-1 truncate text-xs text-muted-foreground">{loading ? " " : detalhe}</p>
    </div>
  );
}

function DistribuicaoVigente({
  config,
  unidades,
  valido,
}: {
  config: RateioConfiguracao;
  unidades: UnidadeComRateio[];
  valido: boolean;
}) {
  const nome = (id: string) => unidades.find((u) => u.id === id);
  const itens = [...config.itens].sort(
    (a, b) =>
      unidades.findIndex((u) => u.id === a.unidade_id) -
      unidades.findIndex((u) => u.id === b.unidade_id),
  );
  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {itens
          .filter((i) => i.percentual > 0)
          .map((i) => {
            const u = nome(i.unidade_id);
            return (
              <div
                key={i.unidade_id}
                title={`${u?.nome ?? "Unidade"}: ${formatPct(i.percentual)}`}
                style={{
                  width: `${i.percentual}%`,
                  background: corDaUnidade(u ? unidades.indexOf(u) : 99),
                }}
              />
            );
          })}
      </div>
      <ul className="mt-5 space-y-3">
        {itens.map((i) => {
          const u = nome(i.unidade_id);
          return (
            <li key={i.unidade_id} className="flex items-center gap-3 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: corDaUnidade(u ? unidades.indexOf(u) : 99) }}
              />
              <span className="truncate">{u?.nome ?? "Unidade removida"}</span>
              {u && u.situacao !== "ativa" && <SituacaoBadge situacao={u.situacao} />}
              <span className="tabular ml-auto font-semibold">{formatPct(i.percentual)}</span>
            </li>
          );
        })}
      </ul>
      {!valido && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />A distribuição vigente não soma
          100%. Ajuste os percentuais em “Alterar rateio”.
        </p>
      )}
      {config.observacoes && (
        <p className="mt-4 text-xs text-muted-foreground">Observação: {config.observacoes}</p>
      )}
    </div>
  );
}

function HistoricoRateio({
  rateios,
  unidades,
}: {
  rateios: RateioConfiguracao[];
  unidades: UnidadeComRateio[];
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table className="min-w-[560px]">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="pl-4">Vigência</TableHead>
            {unidades.map((u) => (
              <TableHead key={u.id} className="text-right">
                {u.nome.replace(/^Casa\s+/i, "")}
              </TableHead>
            ))}
            <TableHead className="pr-4 text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rateios.map((c) => {
            const total = c.itens.reduce((a, i) => a + i.percentual, 0);
            const status =
              c.vigencia_inicio > hoje
                ? "Programada"
                : !c.vigencia_fim || c.vigencia_fim >= hoje
                  ? "Vigente"
                  : null;
            return (
              <TableRow key={c.id}>
                <TableCell className="pl-4">
                  <p className="font-medium">
                    {capitalizar(formatMesLongo(c.vigencia_inicio))}
                    {status && (
                      <span
                        className={cn(
                          "ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          status === "Vigente"
                            ? "bg-accent text-accent-foreground"
                            : "bg-primary/[0.07] text-primary",
                        )}
                      >
                        {status}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.vigencia_fim ? `até ${formatMesLongo(c.vigencia_fim)}` : "sem término"}
                    {c.observacoes ? ` · ${c.observacoes}` : ""}
                  </p>
                </TableCell>
                {unidades.map((u) => {
                  const item = c.itens.find((i) => i.unidade_id === u.id);
                  return (
                    <TableCell key={u.id} className="tabular text-right">
                      {item ? (
                        formatPct(item.percentual)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="tabular pr-4 text-right font-semibold">
                  {formatPct(total)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
