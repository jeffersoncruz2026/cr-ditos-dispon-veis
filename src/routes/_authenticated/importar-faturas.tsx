import { createFileRoute } from "@tanstack/react-router";
import { FileUp } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/importar-faturas")({
  head: () => ({ meta: [{ title: "Importar Faturas — SolarGest" }] }),
  component: () => (
    <ModulePage icon={FileUp} title="Importar Faturas" description="Envie as faturas mensais da Equatorial." emptyTitle="Nenhuma fatura importada" emptyText="A importação de faturas em PDF estará disponível na próxima etapa." />
  ),
});
