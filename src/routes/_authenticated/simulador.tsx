import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/simulador")({
  head: () => ({ meta: [{ title: "Simulador de Rateio — SolarGest" }] }),
  component: () => (
    <ModulePage icon={Calculator} title="Simulador de Rateio" description="Simule diferentes percentuais de rateio." emptyTitle="Simulador em preparação" emptyText="Cadastre as unidades e a geração para usar o simulador." />
  ),
});
