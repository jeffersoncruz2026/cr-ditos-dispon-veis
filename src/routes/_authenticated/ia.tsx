import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/ia")({
  head: () => ({ meta: [{ title: "Inteligência Artificial — SolarGest" }] }),
  component: () => (
    <ModulePage icon={Sparkles} title="Inteligência Artificial" description="Recomendações inteligentes de consumo e rateio." emptyTitle="Em breve" emptyText="Os recursos de inteligência artificial serão adicionados nas próximas etapas." />
  ),
});
