import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/fechamento")({
  head: () => ({ meta: [{ title: "Fechamento Mensal — SolarGest" }] }),
  component: Page,
});

function Page() {
  return (
    <ModulePage
      icon={CalendarCheck}
      eyebrow="Operação"
      title="Fechamento Mensal"
      description="Consolide geração, consumo e créditos de cada competência."
      emptyTitle="Nenhum fechamento realizado"
      emptyText="Os fechamentos mensais aparecerão aqui com seu status: aberto, em revisão ou fechado."
      columns={["Competência", "Status", "Geração", "Consumo", "Fechado em"]}
      features={[
        {
          title: "Controle por competência",
          description: "Cada mês possui um único fechamento com status de acompanhamento.",
          ready: true,
        },
        {
          title: "Checklist de pendências",
          description: "Verificação de faturas e geração faltantes antes de fechar o mês.",
        },
        {
          title: "Consolidação automática",
          description: "Totais de geração, consumo e créditos calculados a partir dos lançamentos.",
        },
        {
          title: "Bloqueio de edição",
          description: "Competências fechadas ficam protegidas contra alterações.",
        },
      ]}
    />
  );
}
