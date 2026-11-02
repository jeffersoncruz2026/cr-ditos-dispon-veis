import { createFileRoute } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/distribuicao")({
  head: () => ({ meta: [{ title: "Distribuição de Energia — SolarGest" }] }),
  component: () => (
    <ModulePage icon={Share2} title="Distribuição de Energia" description="Como a energia injetada é dividida." emptyTitle="Nenhuma distribuição definida" emptyText="Defina o rateio entre as unidades para visualizar a distribuição." />
  ),
});
