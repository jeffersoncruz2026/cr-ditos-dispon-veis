import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleSlash,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  SearchX,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, Panel } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase } from "@/integrations/supabase/client";
import { useCurrentAccess } from "@/hooks/use-access";
import { capitalizar, formatMesLongo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  urlAssinadaPdf,
  useConfirmarImportacao,
  useDescartar,
  useImportacao,
  useReprocessar,
  useSalvarRascunho,
  useUnidadesRef,
  type Importacao,
  type UnidadeRef,
} from "@/features/faturas/api";
import {
  CAMPOS,
  dadosVazios,
  ehNumerico,
  normalizarDados,
  SECOES,
  type Campo,
  type ChaveCampo,
  type DadosFatura,
} from "@/features/faturas/campos";
import { numeroBR, verificarDados, type Verificacao } from "@/features/faturas/analise";
import { mensagemErro } from "@/features/unidades/api";
import { AvisoLinha, listaAvisos, MetodoBadge, StatusImportacao } from "@/features/faturas/shared";
import { VisualizadorPdf } from "@/features/faturas/pdf-viewer";
import { VisualizadorXml } from "@/features/faturas/xml-viewer";
import { ehXml, lerXmlNf3e } from "@/features/faturas/xml-nf3e";

export const Route = createFileRoute("/_authenticated/importar-faturas/$importacaoId")({
  head: () => ({ meta: [{ title: "Conferência de fatura — SolarGest" }] }),
  component: Conferencia,
});

type Form = Record<ChaveCampo, string>;

const fmtNum = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2, useGrouping: false });

function paraForm(d: DadosFatura): Form {
  const f = {} as Form;
  for (const c of CAMPOS) {
    const v = d[c.chave];
    if (v === null || v === undefined) f[c.chave] = "";
    else if (ehNumerico(c.tipo) && typeof v === "number") f[c.chave] = fmtNum.format(v);
    else if (c.tipo === "mes") f[c.chave] = String(v).slice(0, 7);
    else f[c.chave] = String(v);
  }
  return f;
}

function deForm(f: Form): DadosFatura {
  const bruto: Record<string, unknown> = {};
  for (const c of CAMPOS) {
    const v = f[c.chave].trim();
    if (!v) bruto[c.chave] = null;
    else if (ehNumerico(c.tipo)) bruto[c.chave] = numeroBR(v);
    else if (c.tipo === "mes") bruto[c.chave] = `${v}-01`;
    else bruto[c.chave] = v;
  }
  return normalizarDados(bruto);
}

function Conferencia() {
  const { importacaoId } = Route.useParams();
  const imp = useImportacao(importacaoId);
  const unidades = useUnidadesRef();

  if (imp.isLoading || unidades.isLoading) {
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[70vh] rounded-2xl" />
        <Skeleton className="h-[70vh] rounded-2xl" />
      </div>
    );
  }
  if (!imp.data) {
    return (
      <Panel>
        <EmptyState
          icon={SearchX}
          title="Importação não encontrada"
          description="O registro pode ter sido removido."
          action={
            <Button asChild variant="outline">
              <Link to="/importar-faturas">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Link>
            </Button>
          }
        />
      </Panel>
    );
  }
  return (
    <Editor
      key={`${imp.data.id}-${imp.data.updated_at}`}
      imp={imp.data}
      unidades={unidades.data ?? []}
    />
  );
}

function Editor({ imp, unidades }: { imp: Importacao; unidades: UnidadeRef[] }) {
  const navigate = useNavigate();
  const { canWrite } = useCurrentAccess();
  const extraido = (imp.dados_extraidos ?? {}) as Record<string, unknown>;
  const [form, setForm] = useState<Form>(() =>
    paraForm({ ...dadosVazios(), ...normalizarDados(extraido) }),
  );
  const [unidadeId, setUnidadeId] = useState<string | null>(imp.unidade_id);
  const [descartando, setDescartando] = useState(false);
  const [reprocessando, setReprocessando] = useState(false);
  const [aba, setAba] = useState<"original" | "dados">("dados");

  const confirmar = useConfirmarImportacao();
  const salvar = useSalvarRascunho();
  const descartar = useDescartar();
  const reprocessar = useReprocessar();

  const editavel = canWrite && (imp.status === "aguardando_conferencia" || imp.status === "erro");
  const dados = useMemo(() => deForm(form), [form]);
  const bruto = imp.texto_extraido ?? "";
  const porXml = ehXml(bruto);
  const leituraXml = useMemo(() => {
    if (!porXml) return null;
    try {
      return lerXmlNf3e(bruto);
    } catch {
      return null;
    }
  }, [bruto, porXml]);
  // No XML, a conferência compara os campos com os valores da nota em formato legível.
  const texto = leituraXml?.texto ?? bruto;
  const fonte = porXml ? "XML" : "PDF";
  const verificacao = useMemo(() => verificarDados(texto, dados), [texto, dados]);
  const unidade = unidades.find((u) => u.id === unidadeId) ?? null;
  const ucDivergente =
    !!unidade && !!dados.numero_uc && unidade.numero_uc.replace(/\D/g, "") !== dados.numero_uc;

  const duplicada = useQuery({
    queryKey: ["fatura-existe", unidadeId, dados.mes_referencia],
    enabled: !!unidadeId && !!dados.mes_referencia && imp.status !== "importada",
    queryFn: async () => {
      const { count } = await supabase
        .from("faturas")
        .select("id", { count: "exact", head: true })
        .eq("unidade_id", unidadeId!)
        .eq("mes_referencia", String(dados.mes_referencia));
      return (count ?? 0) > 0;
    },
  });

  const pdf = useQuery({
    queryKey: ["pdf-url", imp.arquivo_path],
    queryFn: () => urlAssinadaPdf(imp.arquivo_path),
    enabled: !porXml,
    staleTime: 20 * 60_000,
  });

  // Avisos gravados que não dependem dos campos (IA, método, PDF sem texto).
  const avisosFixos = listaAvisos(imp.avisos).filter(
    (a) => !a.campo && !/Já existe fatura|Competência não/.test(a.mensagem),
  );
  const bloqueios: string[] = [];
  if (!unidadeId) bloqueios.push("Selecione a unidade consumidora.");
  if (!dados.mes_referencia) bloqueios.push("Informe a competência.");
  if (duplicada.data)
    bloqueios.push("Já existe fatura importada para esta unidade nesta competência.");
  const conferir = CAMPOS.filter((c) => verificacao[c.chave] === "nao_localizado");
  const preenchidos = CAMPOS.filter((c) => verificacao[c.chave] !== "vazio").length;

  const set = (k: ChaveCampo, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function onConfirmar() {
    if (!unidadeId) return;
    confirmar.mutate(
      { importacaoId: imp.id, unidadeId, dados },
      {
        onSuccess: () => {
          toast.success("Fatura importada com sucesso.");
          navigate({ to: "/importar-faturas" });
        },
        onError: (e) => toast.error(mensagemErro(e, "Não foi possível importar a fatura.")),
      },
    );
  }

  return (
    <>
      <Link
        to="/importar-faturas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Importar faturas
      </Link>

      <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/[0.07] text-destructive">
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-extrabold tracking-tight">{imp.arquivo_nome}</h1>
              <StatusImportacao status={imp.status} />
              <MetodoBadge metodo={imp.metodo_extracao} arquivo={imp.arquivo_nome} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {preenchidos} de {CAMPOS.length} campos identificados
              {typeof extraido["_modelo"] === "string"
                ? ` · extraído por ${extraido["_modelo"]}`
                : ""}
            </p>
          </div>
        </div>
        {editavel && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setDescartando(true)}>
              <Trash2 className="h-4 w-4" /> Descartar
            </Button>
            <Button
              variant="outline"
              onClick={() => setReprocessando(true)}
              disabled={reprocessar.isPending}
            >
              {reprocessar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Reprocessar
            </Button>
            <Button
              variant="outline"
              disabled={salvar.isPending}
              onClick={() =>
                salvar.mutate(
                  {
                    importacaoId: imp.id,
                    unidadeId,
                    dados,
                    extras: {
                      _modelo: extraido["_modelo"] ?? null,
                      ...(extraido["_origem"] ? { _origem: extraido["_origem"] } : {}),
                      ...(extraido["_chave_nf3e"] ? { _chave_nf3e: extraido["_chave_nf3e"] } : {}),
                    },
                  },
                  {
                    onSuccess: () => toast.success("Rascunho salvo."),
                    onError: () => toast.error("Não foi possível salvar."),
                  },
                )
              }
            >
              <Save className="h-4 w-4" /> Salvar rascunho
            </Button>
            <Button onClick={onConfirmar} disabled={bloqueios.length > 0 || confirmar.isPending}>
              {confirmar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirmar importação
            </Button>
          </div>
        )}
        {imp.status === "importada" && imp.unidade_id && (
          <Button asChild variant="outline">
            <Link to="/unidades/$unidadeId" params={{ unidadeId: imp.unidade_id }}>
              Ver na unidade
            </Link>
          </Button>
        )}
      </section>

      {/* Celular/tablet: alterna entre o documento original e os dados. Desktop: lado a lado. Renderizado uma única vez. */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 xl:hidden" role="tablist">
        {(
          [
            ["original", porXml ? "XML da nota" : "PDF original"],
            ["dados", "Dados extraídos"],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={aba === v}
            onClick={() => setAba(v)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              aba === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div
          className={cn(
            "xl:sticky xl:top-20 xl:block xl:self-start",
            aba === "original" ? "block" : "hidden",
          )}
        >
          {porXml ? (
            <VisualizadorXml leitura={leituraXml} xml={bruto} nomeArquivo={imp.arquivo_nome} />
          ) : (
            <VisualizadorPdf url={pdf.data} loading={pdf.isLoading} />
          )}
        </div>
        <div className={cn("xl:block", aba === "dados" ? "block" : "hidden")}>{PainelDados()}</div>
      </div>

      <AlertDialog open={descartando} onOpenChange={setDescartando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar esta importação?</AlertDialogTitle>
            <AlertDialogDescription>
              Os dados extraídos não serão gravados. O arquivo poderá ser enviado novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                descartar.mutate(imp, {
                  onSuccess: () => {
                    toast.success("Importação descartada.");
                    navigate({ to: "/importar-faturas" });
                  },
                })
              }
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reprocessando} onOpenChange={setReprocessando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprocessar a extração?</AlertDialogTitle>
            <AlertDialogDescription>
              A fatura será lida novamente e as correções feitas nesta tela serão substituídas pelos
              novos valores extraídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                reprocessar.mutate(
                  { importacao: imp, unidades },
                  {
                    onSuccess: (r) =>
                      toast.success(
                        r.metodo === "xml"
                          ? "XML lido novamente."
                          : r.metodo === "ia"
                            ? "Extração por IA concluída."
                            : "Extração básica concluída.",
                      ),
                    onError: () => toast.error("Falha ao reprocessar."),
                  },
                )
              }
            >
              Reprocessar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  function PainelDados() {
    return (
      <div className="space-y-5">
        {(bloqueios.length > 0 || avisosFixos.length > 0 || conferir.length > 0 || ucDivergente) &&
          imp.status !== "importada" && (
            <Panel title="Conferência">
              <ul className="space-y-2">
                {bloqueios.map((b) => (
                  <AvisoLinha key={b} aviso={{ nivel: "erro", mensagem: b }} />
                ))}
                {ucDivergente && (
                  <AvisoLinha
                    aviso={{
                      nivel: "atencao",
                      mensagem: `A UC informada (${dados.numero_uc}) difere da UC da unidade selecionada (${unidade?.numero_uc}).`,
                    }}
                  />
                )}
                {conferir.length > 0 && (
                  <AvisoLinha
                    aviso={{
                      nivel: "atencao",
                      mensagem: `${conferir.length} valor(es) não localizado(s) literalmente no ${porXml ? "XML" : "texto do PDF"}: ${conferir
                        .map((c) => c.rotulo)
                        .join(", ")}. Confira com o documento.`,
                    }}
                  />
                )}
                {avisosFixos.map((a, i) => (
                  <AvisoLinha key={i} aviso={a} />
                ))}
              </ul>
            </Panel>
          )}

        <Panel title="Unidade consumidora">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label>Unidade da fatura</Label>
              <Select
                value={unidadeId ?? ""}
                onValueChange={(v) => setUnidadeId(v)}
                disabled={!editavel}
              >
                <SelectTrigger className={cn(!unidadeId && "border-destructive")}>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome} · UC {u.numero_uc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {unidade && imp.unidade_id === unidade.id && imp.status !== "importada" && (
              <p className="flex items-center gap-1.5 pb-2 text-xs text-accent-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" /> Identificada automaticamente pela UC
              </p>
            )}
          </div>
          {dados.mes_referencia && (
            <p className="mt-3 text-sm text-muted-foreground">
              Competência:{" "}
              <span className="font-semibold text-foreground">
                {capitalizar(formatMesLongo(String(dados.mes_referencia)))}
              </span>
            </p>
          )}
        </Panel>

        {SECOES.map((s) => (
          <Panel key={s.id} title={s.titulo}>
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              {CAMPOS.filter((c) => c.secao === s.id).map((c) => (
                <CampoInput
                  key={c.chave}
                  campo={c}
                  valor={form[c.chave]}
                  verificacao={verificacao[c.chave]}
                  fonte={fonte}
                  disabled={!editavel}
                  onChange={(v) => set(c.chave, v)}
                />
              ))}
            </div>
          </Panel>
        ))}
      </div>
    );
  }
}

const UNIDADE: Partial<Record<Campo["tipo"], string>> = { kwh: "kWh", brl: "R$", percentual: "%" };

function CampoInput({
  campo,
  valor,
  verificacao,
  fonte,
  disabled,
  onChange,
}: {
  campo: Campo;
  valor: string;
  verificacao: Verificacao;
  fonte: "XML" | "PDF";
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const sufixo = UNIDADE[campo.tipo];
  const tipoInput = campo.tipo === "data" ? "date" : campo.tipo === "mes" ? "month" : "text";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={campo.chave} title={campo.ajuda} className="leading-tight">
          {campo.rotulo}
        </Label>
        <Indicador v={verificacao} fonte={fonte} />
      </div>
      <div className="relative">
        {sufixo === "R$" && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            R$
          </span>
        )}
        <Input
          id={campo.chave}
          type={tipoInput}
          inputMode={ehNumerico(campo.tipo) ? "decimal" : undefined}
          value={valor}
          disabled={disabled}
          placeholder="Não informado"
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "tabular",
            sufixo === "R$" && "pl-9",
            sufixo && sufixo !== "R$" && "pr-12",
            verificacao === "nao_localizado" && "border-warning bg-warning/5",
            !valor && "bg-muted/40",
          )}
        />
        {sufixo && sufixo !== "R$" && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {sufixo}
          </span>
        )}
      </div>
    </div>
  );
}

function Indicador({ v, fonte }: { v: Verificacao; fonte: "XML" | "PDF" }) {
  if (v === "encontrado")
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-foreground"
        title={`Valor localizado no ${fonte === "XML" ? "XML" : "texto do PDF"}`}
      >
        <CheckCircle2 className="h-3 w-3" /> No {fonte}
      </span>
    );
  if (v === "nao_localizado")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning-foreground">
        <AlertTriangle className="h-3 w-3" /> Conferir
      </span>
    );
  if (v === "vazio")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <CircleSlash className="h-3 w-3" /> Não informado
      </span>
    );
  return null;
}
