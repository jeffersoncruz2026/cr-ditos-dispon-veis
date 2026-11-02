import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/ia")({
  head: () => ({ meta: [{ title: "Inteligência Artificial — SolarGest" }] }),
  component: Page,
});

function Page() {
  return (
    <ModulePage
      icon={Sparkles}
      eyebrow="Análise"
      title="Inteligência Artificial"
      description="Assistente inteligente para análise de consumo e recomendações de rateio."
      emptyTitle="Assistente ainda não disponível"
      emptyText="Os recursos de inteligência artificial serão habilitados em uma próxima etapa do projeto."
      features={[
        {
          title: "Leitura assistida de faturas",
          description: "Interpretação automática de faturas e detecção de inconsistências.",
        },
        {
          title: "Recomendação de rateio",
          description: "Sugestão de percentuais com base no histórico de consumo.",
        },
        {
          title: "Detecção de anomalias",
          description: "Identificação de consumo ou geração fora do padrão.",
        },
        {
          title: "Perguntas em linguagem natural",
          description: "Consultas sobre os dados do sistema em português.",
        },
      ]}
    />
  );
}
