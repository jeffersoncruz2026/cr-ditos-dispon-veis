import { getRouteApi } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  operador: "Operador",
  visualizador: "Visualizador",
};

/** Papéis do usuário logado. Sem papel = acesso pendente de autorização. */
export function useAccess(userId: string) {
  const query = useQuery({
    queryKey: ["access", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      return data.map((r) => r.role);
    },
    staleTime: 60_000,
  });
  const roles = query.data ?? [];
  return {
    ...query,
    roles,
    authorized: roles.length > 0,
    isAdmin: roles.includes("admin"),
    canWrite: roles.includes("admin") || roles.includes("operador"),
    primaryRole: (["admin", "operador", "visualizador"] as const).find((r) => roles.includes(r)),
  };
}

/** Atalho para páginas dentro da área autenticada. */
export function useCurrentUser() {
  return getRouteApi("/_authenticated").useRouteContext().user;
}

export function useCurrentAccess() {
  return useAccess(useCurrentUser().id);
}
