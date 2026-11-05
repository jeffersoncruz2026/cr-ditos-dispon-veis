import { createFileRoute } from "@tanstack/react-router";
import { Sun } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/geracao")({
  head: () => ({ meta: [{ title: "Geração Solar — SolarGest" }] }),
  component: Page,
});

function Page() {
  return (
    <ModulePage
      icon={Sun}
      eyebrow="Gestão energética"
      title="Geração Solar"
      description="Acompanhe a produção mensal da usina fotovoltaica e a energia injetada na rede."
      emptyTitle="Nenhuma geração registrada"
      emptyText="Os registros mensais de geração e energia injetada aparecerão aqui."
      columns={["Competência", "Usina", "Geração (kWh)", "Injetada (kWh)", "Observações"]}
      features={[
        {
          title: "Cadastro de usinas",
          description: "Potência instalada (kWp), módulos, inversor e unidade geradora vinculada.",
          ready: true,
        },
        {
          title: "Lançamento mensal de geração",
          description: "Registro da geração e da energia injetada por competência.",
        },
        {
          title: "Desempenho da usina",
          description: "Comparativo da produção ao longo dos meses.",
        },
        {
          title: "Integração com inversor",
          description: "Coleta automatizada de dados de geração em etapa futura.",
        },
      ]}
    />
  );
}
