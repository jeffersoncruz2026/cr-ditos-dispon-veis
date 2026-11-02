import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Lock, Sun } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — SolarGest" },
      { name: "description", content: "Acesse o SolarGest para gerenciar sua energia solar." },
      { property: "og:title", content: "Entrar — SolarGest" },
      {
        property: "og:description",
        content: "Acesse o SolarGest para gerenciar sua energia solar.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast.error(mensagemErroLogin(error.message));
        return;
      }
      navigate({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(
        "Cadastro realizado! Confirme seu e-mail e aguarde a autorização de um administrador.",
      );
      setMode("login");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand p-12 text-white lg:flex">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div
          className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Sun className="h-5 w-5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">SolarGest</span>
        </div>
        <div className="relative">
          <h2 className="max-w-lg text-4xl font-extrabold leading-tight tracking-tight">
            Gestão inteligente de energia solar.
          </h2>
          <p className="mt-4 max-w-md text-white/75">
            Acompanhe geração, créditos e rateio entre as unidades consumidoras em um só lugar.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            {[
              "Geração e energia injetada mês a mês",
              "Saldo de créditos por unidade consumidora",
              "Controle de faturas e economia obtida",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-white" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">
          Unidades atendidas pela Equatorial Energia Goiás
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form
          onSubmit={submit}
          className="w-full max-w-sm space-y-5 rounded-3xl bg-card p-8 shadow-card"
        >
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
              <Sun className="h-5 w-5" />
            </div>
            <span className="font-extrabold tracking-tight">SolarGest</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Acesso restrito a usuários autorizados.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function mensagemErroLogin(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("email not confirmed"))
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  if (m.includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns minutos.";
  if (m.includes("fetch") || m.includes("network"))
    return "Falha de conexão com o servidor. Tente novamente.";
  return `Não foi possível entrar: ${msg}`;
}
