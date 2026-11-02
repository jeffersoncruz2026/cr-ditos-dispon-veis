import { createFileRoute } from "@tanstack/react-router";
import { Sun } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/geracao")({
  head: () => ({ meta: [{ title: "Geração Solar — SolarGest" }] }),
  component: () => (
    <ModulePage icon={Sun} title="Geração Solar" description="Acompanhe a produção da usina." emptyTitle="Nenhuma geração registrada" emptyText="Os registros de geração mensal aparecerão aqui." />
  ),
});
