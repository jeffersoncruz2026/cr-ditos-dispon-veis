import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ModulePage } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — SolarGest" }] }),
  component: Page,
});

function Page() {
  return (
    <ModulePage
      icon={FileText}
      eyebrow="Administração"
      title="Relatórios"
      description="Gere relatórios consolidados de geração, consumo, créditos e finanças."
      emptyTitle="Nenhum relatório gerado"
      emptyText="Os relatórios emitidos ficarão disponíveis aqui para consulta e download."
      columns={["Relatório", "Período", "Gerado em", "Formato"]}
      features={[
        {
          title: "Relatório mensal consolidado",
          description: "Resumo da competência com geração, consumo e créditos por unidade.",
        },
        { title: "Relatório anual", description: "Visão de doze meses com totais e médias." },
        {
          title: "Exportação em PDF e planilha",
          description: "Download dos relatórios para compartilhamento.",
        },
        {
          title: "Relatório por unidade",
          description: "Extrato individual para cada unidade consumidora.",
        },
      ]}
    />
  );
}
