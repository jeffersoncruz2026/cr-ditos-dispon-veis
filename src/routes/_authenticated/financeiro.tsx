import { createFileRoute } from "@tanstack/react-router";
import { LineChart } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Análise Financeira — SolarGest" }] }),
  component: Page,
});

function Page() {
  return (
    <ModulePage
      icon={LineChart}
      eyebrow="Análise"
      title="Análise Financeira"
      description="Acompanhe despesas com energia, economia gerada e retorno do investimento."
      emptyTitle="Nenhum dado financeiro"
      emptyText="Os indicadores financeiros serão exibidos após o lançamento das primeiras faturas."
      columns={["Competência", "Valor faturado", "Economia", "Iluminação pública"]}
      features={[
        {
          title: "Estrutura de valores das faturas",
          description:
            "Valor total, tarifa, bandeira tarifária e contribuição de iluminação pública.",
          ready: true,
        },
        {
          title: "Evolução das despesas",
          description: "Histórico mensal de gastos por unidade e consolidado.",
        },
        {
          title: "Economia gerada",
          description: "Comparativo entre o custo com e sem a geração solar.",
        },
        {
          title: "Retorno do investimento",
          description: "Payback e rentabilidade da usina fotovoltaica.",
        },
      ]}
    />
  );
}
