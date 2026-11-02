import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — SolarGest" }] }),
  component: () => (
    <ModulePage icon={Settings} title="Configurações" description="Preferências do sistema e da conta." emptyTitle="Nenhuma configuração disponível" emptyText="As configurações do sistema serão adicionadas em breve." />
  ),
});
