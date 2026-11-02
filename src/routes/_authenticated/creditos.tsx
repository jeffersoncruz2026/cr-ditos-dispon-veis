import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/creditos")({
  head: () => ({ meta: [{ title: "Gestão de Créditos — SolarGest" }] }),
  component: () => (
    <ModulePage icon={Wallet} title="Gestão de Créditos" description="Saldo e validade dos créditos por unidade." emptyTitle="Nenhum crédito registrado" emptyText="Os saldos de créditos aparecerão após o primeiro fechamento." />
  ),
});
