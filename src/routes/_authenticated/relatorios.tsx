import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — SolarGest" }] }),
  component: () => (
    <ModulePage icon={FileText} title="Relatórios" description="Relatórios mensais e anuais." emptyTitle="Nenhum relatório disponível" emptyText="Os relatórios ficarão disponíveis após os primeiros fechamentos." />
  ),
});
