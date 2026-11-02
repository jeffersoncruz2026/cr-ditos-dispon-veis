import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, Database, Lock, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader, Panel } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roleLabels, useCurrentAccess, useCurrentUser, type AppRole } from "@/hooks/use-access";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — SolarGest" }] }),
  component: Configuracoes,
});

const roleDescriptions: Record<AppRole, string> = {
  admin: "Acesso completo e gestão de usuários",
  operador: "Consulta e lançamento de dados",
  visualizador: "Somente consulta",
};

function Configuracoes() {
  const access = useCurrentAccess();
  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Configurações"
        description="Conta, usuários autorizados e parâmetros do sistema."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <MinhaConta />
          {access.isAdmin && <Usuarios />}
        </div>
        <div className="space-y-6">
          <Panel title="Concessionária">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.07] text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Equatorial Energia Goiás</p>
                <p className="text-xs text-muted-foreground">
                  Sistema de Compensação de Energia Elétrica
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Segurança dos dados">
            <ul className="space-y-4 text-sm">
              <SecItem
                icon={Lock}
                title="Acesso restrito"
                text="Somente usuários autenticados e autorizados por um administrador acessam os dados."
              />
              <SecItem
                icon={ShieldCheck}
                title="Permissões por papel"
                text="Administradores, operadores e visualizadores possuem níveis de acesso distintos."
              />
              <SecItem
                icon={Database}
                title="Políticas no banco de dados"
                text="As regras de acesso são aplicadas diretamente no banco (Row Level Security)."
              />
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

function SecItem({ icon: Icon, title, text }: { icon: typeof Lock; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      <div>
        <p className="font-semibold leading-tight">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}

function MinhaConta() {
  const user = useCurrentUser();
  const { primaryRole } = useCurrentAccess();
  const qc = useQueryClient();
  const { data: perfil, isLoading } = useQuery({
    queryKey: ["perfil", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [nome, setNome] = useState("");
  useEffect(() => {
    setNome(perfil?.nome ?? "");
  }, [perfil?.nome]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("perfis")
        .update({ nome: nome.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      qc.invalidateQueries({ queryKey: ["perfil", user.id] });
    },
    onError: () => toast.error("Não foi possível atualizar o perfil."),
  });

  return (
    <Panel title="Minha conta" description="Informações do seu acesso ao SolarGest.">
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={user.email ?? ""} disabled />
          </div>
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Papel: </span>
              {primaryRole && <Badge variant="secondary">{roleLabels[primaryRole]}</Badge>}
            </div>
            <Button type="submit" disabled={save.isPending || nome === (perfil?.nome ?? "")}>
              Salvar
            </Button>
          </div>
        </form>
      )}
    </Panel>
  );
}

function Usuarios() {
  const me = useCurrentUser();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const [perfis, roles] = await Promise.all([
        supabase.from("perfis").select("id, nome, email, created_at").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (perfis.error) throw perfis.error;
      if (roles.error) throw roles.error;
      return perfis.data.map((p) => ({
        ...p,
        role: roles.data.find((r) => r.user_id === p.id)?.role ?? null,
      }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole | "nenhum" }) => {
      const del = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (del.error) throw del.error;
      if (role !== "nenhum") {
        const ins = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (ins.error) throw ins.error;
      }
    },
    onSuccess: () => {
      toast.success("Permissão atualizada.");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: () => toast.error("Não foi possível alterar a permissão."),
  });

  const pendentes = data?.filter((u) => !u.role).length ?? 0;

  return (
    <Panel
      title="Usuários e permissões"
      description="Autorize novos usuários e defina o nível de acesso de cada um."
      action={
        pendentes > 0 ? (
          <Badge className="bg-warning/20 text-warning-foreground hover:bg-warning/20">
            {pendentes} pendente(s)
          </Badge>
        ) : undefined
      }
    >
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data?.length ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário"
          description="Os usuários cadastrados aparecerão aqui."
          compact
        />
      ) : (
        <ul className="divide-y rounded-xl border">
          {data.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {u.nome || u.email}{" "}
                  {u.id === me.id && (
                    <span className="font-normal text-muted-foreground">(você)</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email} · desde {new Date(u.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <Select
                value={u.role ?? "nenhum"}
                disabled={u.id === me.id || setRole.isPending}
                onValueChange={(v) =>
                  setRole.mutate({ userId: u.id, role: v as AppRole | "nenhum" })
                }
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(roleLabels) as AppRole[]).map((r) => (
                    <SelectItem key={r} value={r} title={roleDescriptions[r]}>
                      {roleLabels[r]}
                    </SelectItem>
                  ))}
                  <SelectItem value="nenhum">Sem acesso</SelectItem>
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
