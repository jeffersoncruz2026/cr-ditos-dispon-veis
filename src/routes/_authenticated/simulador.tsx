import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/simulador")({
  head: () => ({ meta: [{ title: "Simulador de Rateio — SolarGest" }] }),
  component: Page,
});

function Page() {
  return (
    <ModulePage
      icon={Calculator}
      eyebrow="Energia"
      title="Simulador de Rateio"
      description="Teste cenários de distribuição antes de solicitar alterações à concessionária."
      emptyTitle="Nenhuma simulação criada"
      emptyText="As simulações de rateio salvas aparecerão aqui para comparação."
      columns={["Cenário", "Unidades", "Criado em", "Resultado"]}
      features={[
        {
          title: "Cenários de distribuição",
          description: "Ajuste de percentuais por unidade em um ambiente isolado.",
        },
        {
          title: "Projeção de saldo",
          description: "Estimativa do saldo de créditos resultante de cada cenário.",
        },
        {
          title: "Comparação de cenários",
          description: "Avaliação lado a lado de diferentes configurações.",
        },
        {
          title: "Aplicar como rateio",
          description: "Transformar uma simulação aprovada em novo rateio vigente.",
        },
      ]}
    />
  );
}
