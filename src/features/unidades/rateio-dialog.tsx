import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { capitalizar, formatMesLongo } from "@/lib/format";
import {
  mensagemErro,
  useAplicarRateio,
  type RateioConfiguracao,
  type UnidadeComRateio,
} from "./api";
import {
  corDaUnidade,
  formatPct,
  isoParaMes,
  mesParaIso,
  parseDecimal,
  SituacaoBadge,
} from "./shared";

/** Regras da configuração de distribuição (espelham a função aplicar_rateio no banco). */
export function validarRateio(
  linhas: { unidade: UnidadeComRateio; valor: number | null }[],
  vigencia: string,
  ultima: RateioConfiguracao | null,
) {
  const erros: string[] = [];
  if (linhas.some((l) => l.valor === null))
    erros.push("Preencha o percentual de todas as unidades.");
  if (linhas.some((l) => l.valor !== null && (l.valor < 0 || l.valor > 100)))
    erros.push("Cada percentual deve estar entre 0% e 100%.");
  if (linhas.some((l) => l.valor !== null && Math.abs(l.valor * 100 - Math.round(l.valor * 100)) > 1e-6))
    erros.push("Use no máximo duas casas decimais.");
  if (linhas.some((l) => l.unidade.situacao === "inativa" && (l.valor ?? 0) > 0))
    erros.push("Unidades inativas não podem receber percentual.");
  const soma = linhas.reduce((a, l) => a + (l.valor ?? 0), 0);
  const somaCent = Math.round(soma * 100);
  if (somaCent !== 10000)
    erros.push(`A soma deve ser exatamente 100% (atual: ${formatPct(soma)}).`);
  if (!vigencia) erros.push("Informe o mês de início da vigência.");
  else if (ultima && vigencia < isoParaMes(ultima.vigencia_inicio))
    erros.push(
      `A vigência deve ser igual ou posterior a ${formatMesLongo(ultima.vigencia_inicio)}.`,
    );
  return { erros, soma: somaCent / 100 };
}

export function RateioDialog({
  unidades,
  ultima,
  onClose,
}: {
  unidades: UnidadeComRateio[];
  /** Configuração mais recente (vigente ou programada): base para a nova vigência. */
  ultima: RateioConfiguracao | null;
  onClose: () => void;
}) {
  const participantes = unidades.filter((u) => u.situacao !== "inativa");
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [vigencia, setVigencia] = useState(() =>
    ultima && isoParaMes(ultima.vigencia_inicio) > mesAtual
      ? isoParaMes(ultima.vigencia_inicio)
      : mesAtual,
  );
  const [observacoes, setObservacoes] = useState("");
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      participantes.map((u) => {
        const p = ultima?.itens.find((i) => i.unidade_id === u.id)?.percentual ?? 0;
        return [u.id, String(p).replace(".", ",")];
      }),
    ),
  );
  const aplicar = useAplicarRateio();

  const linhas = participantes.map((u) => ({
    unidade: u,
    valor: parseDecimal(valores[u.id] ?? ""),
  }));
  const { erros, soma } = useMemo(
    () => validarRateio(linhas, vigencia, ultima),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [valores, vigencia, ultima],
  );
  const correcao = !!ultima && vigencia === isoParaMes(ultima.vigencia_inicio);
  const restante = Math.round((100 - soma) * 100) / 100;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (erros.length) return;
    aplicar.mutate(
      {
        vigencia: mesParaIso(vigencia)!,
        itens: linhas.map((l) => ({ unidade_id: l.unidade.id, percentual: l.valor ?? 0 })),
        observacoes,
      },
      {
        onSuccess: () => {
          toast.success("Rateio atualizado.");
          onClose();
        },
        onError: (err) => toast.error(mensagemErro(err, "Não foi possível salvar o rateio.")),
      },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Alterar percentuais de rateio</DialogTitle>
          <DialogDescription>
            A nova configuração passa a valer a partir do mês informado. A configuração anterior é
            encerrada e mantida no histórico.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vigencia">Início da vigência</Label>
              <Input
                id="vigencia"
                type="month"
                value={vigencia}
                min={ultima ? isoParaMes(ultima.vigencia_inicio) : undefined}
                onChange={(e) => setVigencia(e.target.value)}
              />
            </div>
            {ultima && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Última configuração</Label>
                <p className="flex h-9 items-center text-sm font-medium">
                  a partir de {formatMesLongo(ultima.vigencia_inicio)}
                </p>
              </div>
            )}
          </div>
          {correcao && (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
              Mesmo mês da última configuração: ela será <strong>substituída</strong> (correção).
            </p>
          )}

          <div className="overflow-hidden rounded-xl border">
            {linhas.map(({ unidade: u, valor }) => (
              <div
                key={u.id}
                className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: corDaUnidade(unidades.indexOf(u)) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u.nome}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Vigente: {u.percentual === null ? "—" : formatPct(u.percentual)}</span>
                    {u.situacao !== "ativa" && <SituacaoBadge situacao={u.situacao} />}
                  </div>
                </div>
                <div className="relative w-28">
                  <Input
                    aria-label={`Percentual de ${u.nome}`}
                    inputMode="decimal"
                    value={valores[u.id] ?? ""}
                    onChange={(e) => setValores((v) => ({ ...v, [u.id]: e.target.value }))}
                    className={cn(
                      "tabular pr-8 text-right font-semibold",
                      (valor === null || valor < 0 || valor > 100) && "border-destructive",
                    )}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
              <span className="text-sm font-semibold">Total distribuído</span>
              <span
                className={cn(
                  "tabular flex items-center gap-1.5 text-sm font-bold",
                  restante === 0 ? "text-accent-foreground" : "text-destructive",
                )}
              >
                {restante === 0 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {formatPct(soma)}
                {restante !== 0 && (
                  <span className="font-medium">
                    (
                    {restante > 0
                      ? `faltam ${formatPct(restante)}`
                      : `excede ${formatPct(-restante)}`}
                    )
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Barra de distribuição */}
          <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
            {linhas.map(({ unidade: u, valor }) =>
              valor && valor > 0 ? (
                <div
                  key={u.id}
                  style={{
                    width: `${Math.min(valor, 100)}%`,
                    background: corDaUnidade(unidades.indexOf(u)),
                  }}
                />
              ) : null,
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs-rateio">Observações</Label>
            <Textarea
              id="obs-rateio"
              rows={2}
              placeholder="Ex.: inclusão da Casa Mirian no rateio"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          {erros.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {erros.map((er) => (
                <li key={er}>• {er}</li>
              ))}
            </ul>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={erros.length > 0 || aplicar.isPending}>
              {aplicar.isPending
                ? "Salvando..."
                : correcao
                  ? "Corrigir última configuração"
                  : vigencia
                    ? `Aplicar a partir de ${capitalizar(formatMesLongo(`${vigencia}-01`))}`
                    : "Aplicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
