import { useState } from "react";
import { Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mensagemErro, useSalvarUnidade, type UnidadeComRateio } from "./api";
import {
  classes,
  DISTRIBUIDORA_PADRAO,
  isoParaMes,
  ligacoes,
  mesParaIso,
  parseDecimal,
  situacoes,
  type Situacao,
} from "./shared";

type Form = {
  nome: string;
  numero_uc: string;
  tipo: "geradora" | "recebedora";
  distribuidora: string;
  situacao: Situacao;
  titular: string;
  endereco: string;
  cidade: string;
  classe: string;
  tipo_ligacao: string;
  observacoes: string;
  potencia_kwp: string;
  quantidade_modulos: string;
  potencia_modulo_w: string;
  inversor: string;
  data_instalacao: string;
};

const num = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : String(v).replace(".", ",");

function inicial(u: UnidadeComRateio | null): Form {
  return {
    nome: u?.nome ?? "",
    numero_uc: u?.numero_uc ?? "",
    tipo: u?.geradora ? "geradora" : "recebedora",
    distribuidora: u?.distribuidora ?? DISTRIBUIDORA_PADRAO,
    situacao: (u?.situacao as Situacao) ?? "aguardando_rateio",
    titular: u?.titular ?? "",
    endereco: u?.endereco ?? "",
    cidade: u?.cidade ?? "",
    classe: u?.classe ?? "",
    tipo_ligacao: u?.tipo_ligacao ?? "",
    observacoes: u?.observacoes ?? "",
    potencia_kwp: num(u?.usina?.potencia_kwp),
    quantidade_modulos: num(u?.usina?.quantidade_modulos),
    potencia_modulo_w: num(u?.usina?.potencia_modulo_w),
    inversor: u?.usina?.inversor ?? "",
    data_instalacao: isoParaMes(u?.usina?.data_instalacao),
  };
}

export function UnidadeFormDialog({
  unidade,
  onClose,
  onSaved,
}: {
  unidade: UnidadeComRateio | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const [form, setForm] = useState<Form>(() => inicial(unidade));
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErros((e) => ({ ...e, [k]: undefined }));
  };
  const salvar = useSalvarUnidade();
  const geradora = form.tipo === "geradora";

  const placas = parseDecimal(form.quantidade_modulos);
  const watts = parseDecimal(form.potencia_modulo_w);
  const potenciaCalculada = placas && watts ? (placas * watts) / 1000 : null;

  function validar() {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.nome.trim()) e.nome = "Informe o nome da unidade.";
    const uc = form.numero_uc.replace(/\D/g, "");
    if (!uc) e.numero_uc = "Informe o número da UC.";
    else if (uc.length < 6 || uc.length > 15) e.numero_uc = "A UC deve ter entre 6 e 15 dígitos.";
    if (geradora) {
      for (const k of ["potencia_kwp", "quantidade_modulos", "potencia_modulo_w"] as const) {
        const v = parseDecimal(form[k]);
        if (form[k].trim() && (v === null || v <= 0)) e[k] = "Valor inválido.";
      }
      for (const k of ["quantidade_modulos", "potencia_modulo_w"] as const) {
        const v = parseDecimal(form[k]);
        if (v !== null && !Number.isInteger(v)) e[k] = "Use um número inteiro.";
      }
    }
    setErros(e);
    return Object.keys(e).length === 0;
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validar()) return;
    salvar.mutate(
      {
        id: unidade?.id ?? null,
        unidade: {
          nome: form.nome.trim(),
          numero_uc: form.numero_uc.replace(/\D/g, ""),
          geradora,
          distribuidora: form.distribuidora.trim() || DISTRIBUIDORA_PADRAO,
          situacao: form.situacao,
          titular: form.titular.trim() || null,
          endereco: form.endereco.trim() || null,
          cidade: form.cidade.trim() || null,
          classe: form.classe || null,
          tipo_ligacao: form.tipo_ligacao || null,
          observacoes: form.observacoes.trim() || null,
        },
        usina: geradora
          ? {
              potencia_kwp: parseDecimal(form.potencia_kwp),
              quantidade_modulos: parseDecimal(form.quantidade_modulos),
              potencia_modulo_w: parseDecimal(form.potencia_modulo_w),
              inversor: form.inversor.trim() || null,
              data_instalacao: mesParaIso(form.data_instalacao),
            }
          : null,
      },
      {
        onSuccess: (id) => {
          toast.success(unidade ? "Unidade atualizada." : "Unidade cadastrada.");
          onSaved?.(id);
          onClose();
        },
        onError: (e) => toast.error(mensagemErro(e, "Não foi possível salvar a unidade.")),
      },
    );
  }

  const campo = (
    k: keyof Form,
    label: string,
    opts?: {
      required?: boolean;
      placeholder?: string;
      inputMode?: "numeric" | "decimal";
      type?: string;
      hint?: string | undefined;
    },
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>
        {label}
        {opts?.required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={k}
        type={opts?.type ?? "text"}
        placeholder={opts?.placeholder}
        inputMode={opts?.inputMode}
        value={form[k]}
        aria-invalid={!!erros[k]}
        onChange={(e) => set(k, e.target.value as Form[typeof k])}
        className={erros[k] ? "border-destructive focus-visible:ring-destructive/40" : undefined}
      />
      {erros[k] ? (
        <p className="text-xs text-destructive">{erros[k]}</p>
      ) : (
        opts?.hint && <p className="text-xs text-muted-foreground">{opts.hint}</p>
      )}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {unidade ? `Editar ${unidade.nome}` : "Nova unidade consumidora"}
          </DialogTitle>
          <DialogDescription>
            Informe os dados conforme constam na fatura da distribuidora. O percentual de rateio é
            definido em “Alterar rateio”, com data de vigência.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={submit} noValidate>
          <fieldset className="space-y-4">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Identificação
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {campo("nome", "Nome", { required: true, placeholder: "Ex.: Casa Jefferson" })}
              {campo("numero_uc", "Número da UC", { required: true, inputMode: "numeric" })}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => set("tipo", v as Form["tipo"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geradora">Geradora</SelectItem>
                    <SelectItem value="recebedora">Recebedora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Situação</Label>
                <Select value={form.situacao} onValueChange={(v) => set("situacao", v as Situacao)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(situacoes).map(([v, s]) => (
                      <SelectItem key={v} value={v}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {campo("distribuidora", "Distribuidora")}
              {campo("titular", "Titular")}
            </div>
          </fieldset>

          {geradora && (
            <fieldset className="space-y-4 rounded-xl border border-success/30 bg-accent/30 p-4">
              <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                <Sun className="h-3.5 w-3.5" /> Sistema fotovoltaico
              </legend>
              <div className="grid gap-4 sm:grid-cols-3">
                {campo("quantidade_modulos", "Quantidade de placas", { inputMode: "numeric" })}
                {campo("potencia_modulo_w", "Potência individual (W)", { inputMode: "numeric" })}
                {campo("potencia_kwp", "Potência instalada (kWp)", {
                  inputMode: "decimal",
                  hint: potenciaCalculada
                    ? `Placas × potência = ${potenciaCalculada.toLocaleString("pt-BR")} kWp`
                    : undefined,
                })}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {campo("inversor", "Inversor", { placeholder: "Marca e modelo" })}
                {campo("data_instalacao", "Instalação (mês/ano)", { type: "month" })}
              </div>
            </fieldset>
          )}

          <fieldset className="space-y-4">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Localização e ligação
            </legend>
            <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
              {campo("endereco", "Endereço")}
              {campo("cidade", "Cidade")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Classe</Label>
                <Select value={form.classe} onValueChange={(v) => set("classe", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Não informada" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de ligação</Label>
                <Select value={form.tipo_ligacao} onValueChange={(v) => set("tipo_ligacao", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Não informado" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ligacoes).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                rows={2}
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
              />
            </div>
          </fieldset>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending
                ? "Salvando..."
                : unidade
                  ? "Salvar alterações"
                  : "Cadastrar unidade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
