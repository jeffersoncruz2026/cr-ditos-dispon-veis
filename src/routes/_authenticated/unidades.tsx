import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Home, MapPin, MoreHorizontal, Pencil, Plus, Sun, Trash2, User, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { EmptyState, PageHeader, Panel } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentAccess } from "@/hooks/use-access";

export const Route = createFileRoute("/_authenticated/unidades")({
  head: () => ({ meta: [{ title: "Unidades Consumidoras — SolarGest" }] }),
  component: Unidades,
});

type Unidade = Tables<"unidades_consumidoras">;
type Form = {
  nome: string;
  numero_uc: string;
  titular: string;
  endereco: string;
  cidade: string;
  classe: string;
  tipo_ligacao: string;
  geradora: boolean;
  ativa: boolean;
  observacoes: string;
};

const LIMITE = 4;
const vazio: Form = {
  nome: "",
  numero_uc: "",
  titular: "",
  endereco: "",
  cidade: "",
  classe: "Residencial",
  tipo_ligacao: "",
  geradora: false,
  ativa: true,
  observacoes: "",
};
const ligacoes: Record<string, string> = {
  monofasico: "Monofásico",
  bifasico: "Bifásico",
  trifasico: "Trifásico",
};
const classes = ["Residencial", "Comercial", "Rural", "Industrial", "Poder público"];

function toForm(u: Unidade): Form {
  return {
    nome: u.nome,
    numero_uc: u.numero_uc,
    titular: u.titular ?? "",
    endereco: u.endereco ?? "",
    cidade: u.cidade ?? "",
    classe: u.classe ?? "",
    tipo_ligacao: u.tipo_ligacao ?? "",
    geradora: u.geradora,
    ativa: u.ativa,
    observacoes: u.observacoes ?? "",
  };
}

function Unidades() {
  const qc = useQueryClient();
  const { canWrite } = useCurrentAccess();
  const [editing, setEditing] = useState<Unidade | "new" | null>(null);
  const [removing, setRemoving] = useState<Unidade | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades_consumidoras")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["unidades"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("unidades_consumidoras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unidade excluída.");
      setRemoving(null);
      refresh();
    },
    onError: () => toast.error("Não foi possível excluir a unidade."),
  });

  const ativas = data.filter((u) => u.ativa).length;

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Unidades Consumidoras"
        description="Cadastre as unidades atendidas pela Equatorial Energia Goiás que participam do sistema de compensação."
      >
        {canWrite && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Nova unidade
          </Button>
        )}
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Unidades cadastradas"
          value={isLoading ? null : `${data.length} de ${LIMITE}`}
        />
        <Stat label="Unidades ativas" value={isLoading ? null : String(ativas)} />
        <Stat
          label="Unidade geradora"
          value={isLoading ? null : (data.find((u) => u.geradora)?.nome ?? "Não definida")}
        />
      </div>

      <Panel title="Cadastro" description="Dados cadastrais de cada unidade consumidora.">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={Home}
            title="Nenhuma unidade cadastrada"
            description={`Adicione as ${LIMITE} unidades consumidoras para começar a acompanhar consumo e créditos.`}
            action={
              canWrite && (
                <Button onClick={() => setEditing("new")}>
                  <Plus className="h-4 w-4" /> Cadastrar primeira unidade
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.map((u) => (
              <article
                key={u.id}
                className="group rounded-xl border bg-card p-5 transition hover:border-success/40 hover:shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${u.geradora ? "bg-accent text-accent-foreground" : "bg-primary/[0.07] text-primary"}`}
                    >
                      {u.geradora ? <Sun className="h-5 w-5" /> : <Home className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{u.nome}</p>
                      <p className="tabular text-sm text-muted-foreground">UC {u.numero_uc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {u.geradora && (
                      <Badge className="bg-success text-success-foreground hover:bg-success">
                        Geradora
                      </Badge>
                    )}
                    {!u.ativa && <Badge variant="secondary">Inativa</Badge>}
                    {canWrite && (
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
                          <DropdownMenuItem onSelect={() => setEditing(u)}>
                            <Pencil className="h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setRemoving(u)}
                          >
                            <Trash2 className="h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <dl className="mt-4 grid gap-2 border-t pt-4 text-sm">
                  <Info icon={User} label="Titular" value={u.titular} />
                  <Info
                    icon={MapPin}
                    label="Endereço"
                    value={[u.endereco, u.cidade].filter(Boolean).join(" — ") || null}
                  />
                  <Info
                    icon={Zap}
                    label="Classe / ligação"
                    value={
                      [u.classe, u.tipo_ligacao && ligacoes[u.tipo_ligacao]]
                        .filter(Boolean)
                        .join(" · ") || null
                    }
                  />
                </dl>
              </article>
            ))}
          </div>
        )}
      </Panel>

      {editing && (
        <UnidadeDialog
          unidade={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{removing?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              As faturas, créditos e rateios vinculados a esta unidade também serão excluídos. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (removing) remove.mutate(removing.id);
              }}
              disabled={remove.isPending}
            >
              Excluir unidade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-card">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {value === null ? (
        <Skeleton className="mt-2 h-6 w-20" />
      ) : (
        <p className="mt-1 truncate text-lg font-bold">{value}</p>
      )}
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <dt className="sr-only">{label}</dt>
      <dd className={value ? "text-foreground" : "text-muted-foreground/70"}>
        {value ?? `${label} não informado`}
      </dd>
    </div>
  );
}

function UnidadeDialog({
  unidade,
  onClose,
  onSaved,
}: {
  unidade: Unidade | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Form>(unidade ? toForm(unidade) : vazio);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const payload: TablesInsert<"unidades_consumidoras"> = {
        nome: form.nome.trim(),
        numero_uc: form.numero_uc.trim(),
        titular: form.titular.trim() || null,
        endereco: form.endereco.trim() || null,
        cidade: form.cidade.trim() || null,
        classe: form.classe || null,
        tipo_ligacao: form.tipo_ligacao || null,
        geradora: form.geradora,
        ativa: form.ativa,
        observacoes: form.observacoes.trim() || null,
      };
      const { error } = unidade
        ? await supabase.from("unidades_consumidoras").update(payload).eq("id", unidade.id)
        : await supabase.from("unidades_consumidoras").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(unidade ? "Unidade atualizada." : "Unidade cadastrada.");
      onSaved();
    },
    onError: (e: { code?: string }) =>
      toast.error(
        e.code === "23505"
          ? "Já existe uma unidade com este número de UC."
          : "Não foi possível salvar a unidade.",
      ),
  });

  const text = (
    k: "nome" | "numero_uc" | "titular" | "endereco" | "cidade",
    label: string,
    opts?: { required?: boolean; placeholder?: string; inputMode?: "numeric" },
  ) => (
    <div className="space-y-2">
      <Label htmlFor={k}>
        {label}
        {opts?.required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={k}
        required={opts?.required}
        placeholder={opts?.placeholder}
        inputMode={opts?.inputMode}
        value={form[k]}
        onChange={(e) => set(k, e.target.value)}
      />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {unidade ? "Editar unidade consumidora" : "Nova unidade consumidora"}
          </DialogTitle>
          <DialogDescription>
            Informe os dados conforme constam na fatura da Equatorial Energia Goiás.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {text("nome", "Nome / apelido", { required: true, placeholder: "Ex.: Casa principal" })}
            {text("numero_uc", "Número da UC", { required: true, inputMode: "numeric" })}
          </div>
          {text("titular", "Titular")}
          <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
            {text("endereco", "Endereço")}
            {text("cidade", "Cidade", { placeholder: "Goiânia" })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Classe</Label>
              <Select value={form.classe} onValueChange={(v) => set("classe", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
            <div className="space-y-2">
              <Label>Tipo de ligação</Label>
              <Select value={form.tipo_ligacao} onValueChange={(v) => set("tipo_ligacao", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              rows={2}
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3">
              <span>
                <span className="block text-sm font-medium">Unidade geradora</span>
                <span className="block text-xs text-muted-foreground">Possui a usina solar</span>
              </span>
              <Switch checked={form.geradora} onCheckedChange={(v) => set("geradora", v)} />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3">
              <span>
                <span className="block text-sm font-medium">Unidade ativa</span>
                <span className="block text-xs text-muted-foreground">
                  Participa da compensação
                </span>
              </span>
              <Switch checked={form.ativa} onCheckedChange={(v) => set("ativa", v)} />
            </label>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar unidade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
