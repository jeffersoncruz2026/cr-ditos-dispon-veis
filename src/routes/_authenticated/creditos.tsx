import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/creditos")({
  head: () => ({ meta: [{ title: "Gestão de Créditos — SolarGest" }] }),
  component: Page,
});

function Page() {
  return (
    <ModulePage
      icon={Wallet}
      eyebrow="Energia"
      title="Gestão de Créditos"
      description="Controle o saldo de créditos de energia de cada unidade consumidora."
      emptyTitle="Nenhum crédito registrado"
      emptyText="Os saldos mensais de créditos — anterior, recebido, utilizado e atual — aparecerão aqui."
      columns={[
        "Competência",
        "Unidade",
        "Saldo anterior",
        "Recebidos",
        "Utilizados",
        "Saldo atual",
      ]}
      features={[
        {
          title: "Saldo mensal por unidade",
          description: "Estrutura de saldo anterior, créditos recebidos, utilizados e saldo atual.",
          ready: true,
        },
        {
          title: "Controle de validade",
          description: "Acompanhamento do prazo de expiração dos créditos (60 meses).",
        },
        {
          title: "Alertas de créditos",
          description: "Avisos de saldo baixo ou créditos próximos do vencimento.",
        },
        {
          title: "Extrato consolidado",
          description: "Movimentação de créditos de todas as unidades em um só lugar.",
        },
      ]}
    />
  );
}
