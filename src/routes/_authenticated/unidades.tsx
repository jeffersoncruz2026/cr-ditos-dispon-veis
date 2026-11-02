import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Home, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/unidades")({
  head: () => ({ meta: [{ title: "Unidades Consumidoras — SolarGest" }] }),
  component: Unidades,
});

function Unidades() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", numero_uc: "", titular: "", endereco: "", geradora: false });

  const { data = [], isLoading } = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("unidades_consumidoras").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["unidades"] });
    qc.invalidateQueries({ queryKey: ["unidades-count"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("unidades_consumidoras").insert({ ...form, user_id: u.user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unidade cadastrada.");
      setOpen(false);
      setForm({ nome: "", numero_uc: "", titular: "", endereco: "", geradora: false });
      refresh();
    },
    onError: () => toast.error("Não foi possível cadastrar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("unidades_consumidoras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  return (
    <>
      <PageHeader title="Unidades Consumidoras" description="Cadastre as unidades atendidas pela Equatorial Energia Goiás.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nova unidade</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova unidade consumidora</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
              {([["nome", "Nome / apelido"], ["numero_uc", "Número da UC"], ["titular", "Titular"], ["endereco", "Endereço"]] as const).map(([k, l]) => (
                <div key={k} className="space-y-2">
                  <Label htmlFor={k}>{l}</Label>
                  <Input id={k} required={k === "nome" || k === "numero_uc"} value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="geradora">Unidade geradora (possui usina)</Label>
                <Switch id="geradora" checked={form.geradora} onCheckedChange={(v) => setForm({ ...form, geradora: v })} />
              </div>
              <Button type="submit" className="w-full" disabled={add.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="rounded-2xl bg-card p-6 shadow-card">
        {isLoading ? null : data.length === 0 ? (
          <EmptyState icon={Home} title="Nenhuma unidade cadastrada" description="Adicione suas quatro unidades consumidoras para começar." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.map((u) => (
              <div key={u.id} className="flex items-start justify-between rounded-xl border p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{u.nome}</p>
                    {u.geradora && <Badge className="bg-success text-success-foreground">Geradora</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">UC {u.numero_uc}</p>
                  {u.titular && <p className="text-sm text-muted-foreground">{u.titular}</p>}
                  {u.endereco && <p className="text-xs text-muted-foreground">{u.endereco}</p>}
                </div>
                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove.mutate(u.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
