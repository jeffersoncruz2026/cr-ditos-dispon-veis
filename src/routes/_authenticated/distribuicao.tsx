import { createFileRoute } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/distribuicao")({
  head: () => ({ meta: [{ title: "Distribuição de Energia — SolarGest" }] }),
  component: Page,
});

function Page() {
  return (
    <ModulePage
      icon={Share2}
      eyebrow="Energia"
      title="Distribuição de Energia"
      description="Defina e acompanhe os percentuais de rateio dos créditos entre as unidades."
      emptyTitle="Nenhum rateio cadastrado"
      emptyText="Os percentuais de distribuição vigentes e o histórico de alterações aparecerão aqui."
      columns={["Unidade", "Percentual", "Vigência início", "Vigência fim"]}
      features={[
        {
          title: "Percentuais com vigência",
          description: "Histórico de rateios com data de início e fim de cada configuração.",
          ready: true,
        },
        {
          title: "Validação de 100%",
          description: "Garantia de que a soma dos percentuais vigentes seja exatamente 100%.",
        },
        {
          title: "Formulário da concessionária",
          description: "Geração da lista de rateio no formato exigido pela Equatorial.",
        },
        {
          title: "Comparativo distribuído x utilizado",
          description: "Créditos recebidos frente ao consumo de cada unidade.",
        },
      ]}
    />
  );
}
