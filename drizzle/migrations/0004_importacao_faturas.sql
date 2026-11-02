-- SolarGest — Importação inteligente de faturas.
-- Requer 0001, 0002 e 0003 aplicadas.
--
--   * Campos detalhados da fatura (identificação, consumo, geração/créditos, financeiro).
--     Valor NULL significa "Não informado" na fatura.
--   * importacoes_faturas: fila/histórico de cada PDF enviado (texto extraído, dados
--     propostos pela extração, status de conferência).
--   * Duplicidade bloqueada por hash do arquivo e por UC + competência.
--   * confirmar_importacao_fatura(): grava fatura + créditos de forma atômica.

-- ---------------------------------------------------------------------------
-- Faturas: campos extraídos
-- ---------------------------------------------------------------------------
ALTER TABLE public.faturas
  ADD COLUMN uc_fatura text,
  ADD COLUMN titular text,
  ADD COLUMN leitura_anterior_data date,
  ADD COLUMN leitura_atual_data date,
  ADD COLUMN proxima_leitura_data date,
  ADD COLUMN leitura_anterior numeric(14,2),
  ADD COLUMN leitura_atual numeric(14,2),
  ADD COLUMN energia_nao_compensada_kwh numeric(12,2),
  ADD COLUMN geracao_ciclo_kwh numeric(12,2),
  ADD COLUMN excedente_recebido_kwh numeric(12,2),
  ADD COLUMN creditos_recebidos_kwh numeric(12,2),
  ADD COLUMN creditos_utilizados_kwh numeric(12,2),
  ADD COLUMN saldo_creditos_kwh numeric(12,2),
  ADD COLUMN creditos_a_expirar_kwh numeric(12,2),
  ADD COLUMN creditos_a_expirar_data date,
  ADD COLUMN percentual_rateio numeric(5,2),
  ADD COLUMN valor_energia numeric(12,2),
  ADD COLUMN encargos_gd numeric(12,2),
  ADD COLUMN valor_bandeiras numeric(12,2),
  ADD COLUMN tributos_total numeric(12,2),
  ADD COLUMN icms numeric(12,2),
  ADD COLUMN pis numeric(12,2),
  ADD COLUMN cofins numeric(12,2),
  ADD COLUMN arquivo_path text,
  ADD COLUMN arquivo_hash text,
  ADD COLUMN extracao jsonb,
  ADD CONSTRAINT faturas_arquivo_hash_key UNIQUE (arquivo_hash);

ALTER TABLE public.faturas ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.creditos ALTER COLUMN user_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- Fila e histórico de importações
-- ---------------------------------------------------------------------------
CREATE TABLE public.importacoes_faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  arquivo_nome text NOT NULL,
  arquivo_path text NOT NULL,
  arquivo_hash text NOT NULL,
  arquivo_tamanho integer,
  status text NOT NULL DEFAULT 'processando'
    CHECK (status IN ('processando', 'aguardando_conferencia', 'importada', 'descartada', 'erro')),
  metodo_extracao text CHECK (metodo_extracao IN ('ia', 'basica')),
  unidade_id uuid REFERENCES public.unidades_consumidoras(id) ON DELETE SET NULL,
  mes_referencia date,
  texto_extraido text,
  dados_extraidos jsonb,
  avisos jsonb,
  erro text,
  fatura_id uuid REFERENCES public.faturas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- O mesmo PDF não pode estar em duas importações ativas (descartadas liberam o arquivo).
CREATE UNIQUE INDEX importacoes_hash_ativo_key ON public.importacoes_faturas (arquivo_hash)
  WHERE status <> 'descartada';
CREATE INDEX importacoes_status_idx ON public.importacoes_faturas (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.importacoes_faturas TO authenticated;
GRANT ALL ON public.importacoes_faturas TO service_role;
ALTER TABLE public.importacoes_faturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autorizados_leem" ON public.importacoes_faturas FOR SELECT TO authenticated
  USING (public.is_authorized(auth.uid()));
CREATE POLICY "editores_inserem" ON public.importacoes_faturas FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "editores_atualizam" ON public.importacoes_faturas FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "editores_excluem" ON public.importacoes_faturas FOR DELETE TO authenticated
  USING (public.can_write(auth.uid()));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.importacoes_faturas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Confirmação atômica da importação
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirmar_importacao_fatura(
  _importacao_id uuid,
  _unidade_id uuid,
  _dados jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  _imp importacoes_faturas%ROWTYPE;
  _mes date;
  _fatura uuid;
  _existente uuid;
  _uc text;
BEGIN
  IF NOT public.can_write(auth.uid()) THEN
    RAISE EXCEPTION 'Você não tem permissão para importar faturas.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _imp FROM importacoes_faturas WHERE id = _importacao_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Importação não encontrada.' USING ERRCODE = '22023';
  END IF;
  IF _imp.status = 'importada' THEN
    RAISE EXCEPTION 'Esta fatura já foi importada.' USING ERRCODE = '22023';
  END IF;
  IF _imp.status = 'descartada' THEN
    RAISE EXCEPTION 'Esta importação foi descartada.' USING ERRCODE = '22023';
  END IF;

  IF _unidade_id IS NULL OR NOT EXISTS (SELECT 1 FROM unidades_consumidoras WHERE id = _unidade_id) THEN
    RAISE EXCEPTION 'Selecione a unidade consumidora da fatura.' USING ERRCODE = '22023';
  END IF;

  _mes := date_trunc('month', nullif(_dados ->> 'mes_referencia', '')::date)::date;
  IF _mes IS NULL THEN
    RAISE EXCEPTION 'Informe a competência (mês de referência) da fatura.' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO _existente FROM faturas WHERE unidade_id = _unidade_id AND mes_referencia = _mes;
  IF _existente IS NOT NULL THEN
    SELECT numero_uc INTO _uc FROM unidades_consumidoras WHERE id = _unidade_id;
    RAISE EXCEPTION '%', format('Já existe fatura importada para a UC %s na competência %s.',
      _uc, to_char(_mes, 'MM/YYYY')) USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM faturas WHERE arquivo_hash = _imp.arquivo_hash) THEN
    RAISE EXCEPTION 'Este arquivo PDF já foi importado.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO faturas (
    unidade_id, mes_referencia, uc_fatura, titular,
    leitura_anterior_data, leitura_atual_data, proxima_leitura_data, vencimento, valor_total,
    consumo_kwh, energia_compensada_kwh, energia_nao_compensada_kwh, leitura_anterior, leitura_atual,
    energia_injetada_kwh, geracao_ciclo_kwh, excedente_recebido_kwh, creditos_recebidos_kwh,
    creditos_utilizados_kwh, saldo_creditos_kwh, creditos_a_expirar_kwh, creditos_a_expirar_data,
    percentual_rateio, valor_energia, encargos_gd, contrib_iluminacao, bandeira_tarifaria,
    valor_bandeiras, tributos_total, icms, pis, cofins,
    arquivo_path, arquivo_url, arquivo_hash, extracao, status
  ) VALUES (
    _unidade_id, _mes, nullif(_dados ->> 'numero_uc', ''), nullif(_dados ->> 'titular', ''),
    nullif(_dados ->> 'leitura_anterior_data', '')::date,
    nullif(_dados ->> 'leitura_atual_data', '')::date,
    nullif(_dados ->> 'proxima_leitura_data', '')::date,
    nullif(_dados ->> 'vencimento', '')::date,
    nullif(_dados ->> 'valor_total', '')::numeric,
    nullif(_dados ->> 'consumo_kwh', '')::numeric,
    nullif(_dados ->> 'energia_compensada_kwh', '')::numeric,
    nullif(_dados ->> 'energia_nao_compensada_kwh', '')::numeric,
    nullif(_dados ->> 'leitura_anterior', '')::numeric,
    nullif(_dados ->> 'leitura_atual', '')::numeric,
    nullif(_dados ->> 'energia_injetada_kwh', '')::numeric,
    nullif(_dados ->> 'geracao_ciclo_kwh', '')::numeric,
    nullif(_dados ->> 'excedente_recebido_kwh', '')::numeric,
    nullif(_dados ->> 'creditos_recebidos_kwh', '')::numeric,
    nullif(_dados ->> 'creditos_utilizados_kwh', '')::numeric,
    nullif(_dados ->> 'saldo_creditos_kwh', '')::numeric,
    nullif(_dados ->> 'creditos_a_expirar_kwh', '')::numeric,
    nullif(_dados ->> 'creditos_a_expirar_data', '')::date,
    nullif(_dados ->> 'percentual_rateio', '')::numeric,
    nullif(_dados ->> 'valor_energia', '')::numeric,
    nullif(_dados ->> 'encargos_gd', '')::numeric,
    nullif(_dados ->> 'contrib_iluminacao', '')::numeric,
    nullif(_dados ->> 'bandeira_tarifaria', ''),
    nullif(_dados ->> 'valor_bandeiras', '')::numeric,
    nullif(_dados ->> 'tributos_total', '')::numeric,
    nullif(_dados ->> 'icms', '')::numeric,
    nullif(_dados ->> 'pis', '')::numeric,
    nullif(_dados ->> 'cofins', '')::numeric,
    _imp.arquivo_path, _imp.arquivo_path, _imp.arquivo_hash,
    jsonb_build_object('metodo', _imp.metodo_extracao, 'proposto', _imp.dados_extraidos, 'confirmado', _dados),
    CASE WHEN nullif(_dados ->> 'vencimento', '')::date < current_date THEN 'vencida' ELSE 'pendente' END
  )
  RETURNING id INTO _fatura;

  -- Créditos da competência, obtidos da própria fatura (nunca digitados à parte).
  IF coalesce(_dados ->> 'creditos_recebidos_kwh', _dados ->> 'creditos_utilizados_kwh',
              _dados ->> 'saldo_creditos_kwh') IS NOT NULL THEN
    INSERT INTO creditos (unidade_id, mes_referencia, fatura_id, creditos_recebidos_kwh,
                          creditos_utilizados_kwh, saldo_atual_kwh, validade)
    VALUES (
      _unidade_id, _mes, _fatura,
      nullif(_dados ->> 'creditos_recebidos_kwh', '')::numeric,
      nullif(_dados ->> 'creditos_utilizados_kwh', '')::numeric,
      nullif(_dados ->> 'saldo_creditos_kwh', '')::numeric,
      nullif(_dados ->> 'creditos_a_expirar_data', '')::date
    )
    ON CONFLICT (unidade_id, mes_referencia) DO UPDATE SET
      fatura_id = EXCLUDED.fatura_id,
      creditos_recebidos_kwh = EXCLUDED.creditos_recebidos_kwh,
      creditos_utilizados_kwh = EXCLUDED.creditos_utilizados_kwh,
      saldo_atual_kwh = EXCLUDED.saldo_atual_kwh,
      validade = EXCLUDED.validade;
  END IF;

  UPDATE importacoes_faturas
  SET status = 'importada', fatura_id = _fatura, unidade_id = _unidade_id, mes_referencia = _mes
  WHERE id = _importacao_id;

  RETURN _fatura;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirmar_importacao_fatura(uuid, uuid, jsonb) TO authenticated;
