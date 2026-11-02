import { createFileRoute } from "@tanstack/react-router";
import { LineChart } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Análise Financeira — SolarGest" }] }),
  component: () => (
    <ModulePage icon={LineChart} title="Análise Financeira" description="Custos, economia e evolução das despesas." emptyTitle="Sem dados financeiros" emptyText="As análises serão geradas a partir das faturas importadas." />
  ),
});
