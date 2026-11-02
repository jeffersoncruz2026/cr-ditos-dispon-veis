import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/fechamento")({
  head: () => ({ meta: [{ title: "Fechamento Mensal — SolarGest" }] }),
  component: () => (
    <ModulePage icon={CalendarCheck} title="Fechamento Mensal" description="Consolide os dados de cada mês." emptyTitle="Nenhum fechamento realizado" emptyText="Os fechamentos aparecerão aqui após a importação das faturas." />
  ),
});
