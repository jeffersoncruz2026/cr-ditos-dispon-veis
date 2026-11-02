import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SolarGest — Gestão Inteligente de Energia Solar" },
      { name: "description", content: "Gerencie geração solar e créditos de energia entre suas unidades consumidoras." },
      { property: "og:title", content: "SolarGest — Gestão Inteligente de Energia Solar" },
      { property: "og:description", content: "Gerencie geração solar e créditos de energia entre suas unidades consumidoras." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
