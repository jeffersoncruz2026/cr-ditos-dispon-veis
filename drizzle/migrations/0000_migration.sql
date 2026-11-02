CREATE TABLE public.unidades_consumidoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  numero_uc text NOT NULL,
  endereco text,
  titular text,
  geradora boolean NOT NULL DEFAULT false,
  percentual_rateio numeric(5,2) DEFAULT 0,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  unidade_id uuid NOT NULL REFERENCES public.unidades_consumidoras(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  consumo_kwh numeric(12,2),
  energia_injetada_kwh numeric(12,2),
  energia_compensada_kwh numeric(12,2),
  valor_total numeric(12,2),
  vencimento date,
  arquivo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.geracao_solar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  mes_referencia date NOT NULL,
  geracao_kwh numeric(12,2) NOT NULL,
  energia_injetada_kwh numeric(12,2),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.creditos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  unidade_id uuid NOT NULL REFERENCES public.unidades_consumidoras(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  saldo_anterior_kwh numeric(12,2) DEFAULT 0,
  creditos_recebidos_kwh numeric(12,2) DEFAULT 0,
  creditos_utilizados_kwh numeric(12,2) DEFAULT 0,
  saldo_atual_kwh numeric(12,2) DEFAULT 0,
  validade date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rateios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  unidade_id uuid NOT NULL REFERENCES public.unidades_consumidoras(id) ON DELETE CASCADE,
  vigencia_inicio date NOT NULL,
  percentual numeric(5,2) NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['unidades_consumidoras','faturas','geracao_solar','creditos','rateios'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "own_select" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "own_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "own_update" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "own_delete" ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)', t);
  END LOOP;
END $$;