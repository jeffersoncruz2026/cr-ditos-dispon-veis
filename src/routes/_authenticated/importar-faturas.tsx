import { createFileRoute } from "@tanstack/react-router";
import { FileUp } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/importar-faturas")({
  head: () => ({ meta: [{ title: "Importar Faturas — SolarGest" }] }),
  component: Page,
});

function Page() {
  return (
    <ModulePage
      icon={FileUp}
      eyebrow="Operação"
      title="Importar Faturas"
      description="Envie as faturas mensais da Equatorial Energia Goiás de cada unidade consumidora."
      emptyTitle="Nenhuma fatura importada"
      emptyText="As faturas importadas ficarão listadas aqui, organizadas por competência e unidade."
      columns={["Competência", "Unidade", "Consumo", "Valor", "Status"]}
      features={[
        {
          title: "Armazenamento seguro de PDFs",
          description:
            "Repositório privado para os arquivos das faturas, acessível apenas a usuários autorizados.",
          ready: true,
        },
        {
          title: "Leitura automática de PDFs",
          description:
            "Extração de consumo, energia injetada, compensada e valores diretamente do arquivo.",
        },
        {
          title: "Conferência dos dados extraídos",
          description: "Revisão e correção manual antes de confirmar o lançamento.",
        },
        {
          title: "Histórico por unidade",
          description: "Linha do tempo de faturas com status de pagamento.",
        },
      ]}
    />
  );
}
