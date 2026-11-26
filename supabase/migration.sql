-- ============================================================
-- YakinHome — Supabase SQL Migration
-- Versão: 1.0.0  |  Data: 2026-06-26
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. CUSTOMERS (Cria se não existir)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  street           TEXT,
  number           TEXT,
  district         TEXT DEFAULT '',
  last_order_value NUMERIC(10,2) DEFAULT 0,
  total_spent      NUMERIC(10,2) DEFAULT 0,
  orders_count     INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────
-- 2. PROMOTIONS (Cria se não existir)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promotions (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  discount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  product_id  INTEGER NOT NULL,
  expires_at  TIMESTAMPTZ DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. ORDERS — nova tabela de pedidos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id              BIGSERIAL PRIMARY KEY,
  customer_name   TEXT        NOT NULL,
  customer_phone  TEXT        NOT NULL,
  street          TEXT        NOT NULL,
  number          TEXT        NOT NULL,
  district        TEXT        DEFAULT '',
  items           JSONB       NOT NULL DEFAULT '[]',
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method  TEXT        NOT NULL DEFAULT 'PIX',
  change_for      NUMERIC(10,2) DEFAULT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','preparing','delivery','delivered','cancelled')),
  notes           TEXT        DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_orders_status      ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at  ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone       ON public.orders(customer_phone);

-- Trigger updated_at nos pedidos
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────
-- 4. ORDER_STATUS_HISTORY — histórico de status
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id         BIGSERIAL PRIMARY KEY,
  order_id   BIGINT      NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT        DEFAULT NULL,
  new_status TEXT        NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_osh_order_id ON public.order_status_history(order_id);

-- Trigger automático para registrar mudanças de status
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history(order_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_status_history ON public.orders;
CREATE TRIGGER orders_status_history
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- ─────────────────────────────────────────────
-- 5. RESTAURANT_SETTINGS — configurações globais
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id            INTEGER PRIMARY KEY DEFAULT 1,  -- single-row table
  is_open       BOOLEAN     NOT NULL DEFAULT true,
  open_time     TIME        DEFAULT '11:00',
  close_time    TIME        DEFAULT '22:00',
  delivery_fee  NUMERIC(6,2) DEFAULT 5.00,
  min_order     NUMERIC(6,2) DEFAULT 20.00,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garante que só existe 1 linha
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_single ON public.restaurant_settings(id);

-- Inserir linha padrão se não existir
INSERT INTO public.restaurant_settings (id, is_open)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 6. VIEWS ÚTEIS
-- ─────────────────────────────────────────────

-- View: pedidos de hoje
CREATE OR REPLACE VIEW public.orders_today AS
SELECT *
FROM public.orders
WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
ORDER BY created_at DESC;

-- View: receita dos últimos 7 dias agrupada por dia
CREATE OR REPLACE VIEW public.revenue_last_7_days AS
SELECT
  DATE(created_at AT TIME ZONE 'America/Sao_Paulo') AS day,
  COUNT(*)         AS orders_count,
  SUM(total)       AS revenue
FROM public.orders
WHERE
  status <> 'cancelled'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY day
ORDER BY day ASC;

-- View: top clientes por gasto
CREATE OR REPLACE VIEW public.top_customers AS
SELECT
  id,
  name,
  phone,
  orders_count,
  total_spent,
  created_at
FROM public.customers
ORDER BY total_spent DESC
LIMIT 20;

-- ─────────────────────────────────────────────
-- 7. FUNCTION: atualizar totais do cliente após pedido
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_customer_totals(p_phone TEXT, p_total NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.customers
  SET
    total_spent  = COALESCE(total_spent, 0) + p_total,
    orders_count = COALESCE(orders_count, 0) + 1,
    last_order_value = p_total
  WHERE phone = p_phone;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 8. ADMINS & SEGURANÇA
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir email do admin padrão
INSERT INTO public.admins (email)
VALUES ('admin@saborporcao.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.admins (email)
VALUES ('admin@chefnair.com')
ON CONFLICT (email) DO NOTHING;

-- Habilita RLS na tabela admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para a tabela admins
DROP POLICY IF EXISTS admins_auth_all ON public.admins;
CREATE POLICY admins_auth_all ON public.admins
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ─────────────────────────────────────────────
-- 9. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

-- Habilita RLS nas tabelas sensíveis
ALTER TABLE public.orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings  ENABLE ROW LEVEL SECURITY;

-- Política: apenas administradores leem/escrevem orders
DROP POLICY IF EXISTS orders_auth_all ON public.orders;
CREATE POLICY orders_auth_all ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Política: público pode inserir pedido (checkout) mas não ler/editar
DROP POLICY IF EXISTS orders_insert_anon ON public.orders;
CREATE POLICY orders_insert_anon ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Histórico: apenas admins
DROP POLICY IF EXISTS osh_auth_all ON public.order_status_history;
CREATE POLICY osh_auth_all ON public.order_status_history
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Settings: apenas admins
DROP POLICY IF EXISTS settings_auth_all ON public.restaurant_settings;
CREATE POLICY settings_auth_all ON public.restaurant_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Customers: anon pode inserir, apenas admins leem tudo
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_insert_anon ON public.customers;
CREATE POLICY customers_insert_anon ON public.customers
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS customers_auth_all ON public.customers;
CREATE POLICY customers_auth_all ON public.customers
  FOR ALL TO authenticated USING (public.is_admin());

-- Promotions: anon lê (cardápio), apenas admins escrevem
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promotions_read_anon ON public.promotions;
CREATE POLICY promotions_read_anon ON public.promotions
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS promotions_auth_all ON public.promotions;
CREATE POLICY promotions_auth_all ON public.promotions
  FOR ALL TO authenticated USING (public.is_admin());

-- Product availability: anon le (cardapio), apenas admins escrevem
CREATE TABLE IF NOT EXISTS public.product_availability (
  product_id INTEGER PRIMARY KEY,
  available  BOOLEAN     NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_availability_read_anon ON public.product_availability;
CREATE POLICY product_availability_read_anon ON public.product_availability
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS product_availability_auth_all ON public.product_availability;
CREATE POLICY product_availability_auth_all ON public.product_availability
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────
-- 10. REPLICAÇÃO REALTIME
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Garante que a tabela orders esteja na replicação realtime sem duplicar erros
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime' 
      AND n.nspname = 'public' 
      AND c.relname = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- Garante que a tabela product_availability esteja na replicacao realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'product_availability'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_availability;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 11. SITE_THEME — customização de aparência
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_theme (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  theme_data  JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilita RLS
ALTER TABLE public.site_theme ENABLE ROW LEVEL SECURITY;

-- Política de Leitura Pública
DROP POLICY IF EXISTS theme_read_anon ON public.site_theme;
CREATE POLICY theme_read_anon ON public.site_theme
  FOR SELECT TO anon USING (true);

-- Política de Escrita para Admin
DROP POLICY IF EXISTS theme_write_admin ON public.site_theme;
CREATE POLICY theme_write_admin ON public.site_theme
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Inserção inicial se não existir
INSERT INTO public.site_theme (id, theme_data)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.site_theme (id, theme_data)
VALUES (3, '{"products":[]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Garante que a tabela site_theme esteja na replicação realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'site_theme'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_theme;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 12. MENU_CATALOG — Cardápio completo com categorias e produtos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_catalog (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  catalog_data JSONB NOT NULL DEFAULT '{"categories":[],"products":[]}'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.menu_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS menu_catalog_read_anon ON public.menu_catalog;
CREATE POLICY menu_catalog_read_anon ON public.menu_catalog
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS menu_catalog_write_admin ON public.menu_catalog;
CREATE POLICY menu_catalog_write_admin ON public.menu_catalog
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.menu_catalog (id, catalog_data)
VALUES (1, '{"categories":[],"products":[]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'menu_catalog'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_catalog;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 13. ORDERS GPS LOCATION & QR CODE SUPPORT
-- ─────────────────────────────────────────────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC(10, 2);

CREATE INDEX IF NOT EXISTS idx_orders_location ON public.orders(latitude, longitude);

-- ─────────────────────────────────────────────
-- 14. SISTEMA DE COMANDAS ABERTAS (BALCÃO / GARÇONS)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.comandas (
  id              BIGSERIAL PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL CHECK (char_length(trim(label)) > 0),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  items_count     INTEGER NOT NULL DEFAULT 0,
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  opened_by       TEXT NOT NULL DEFAULT '',
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by       TEXT DEFAULT NULL,
  closed_at       TIMESTAMPTZ DEFAULT NULL,
  payment_method  TEXT DEFAULT NULL,
  change_for      NUMERIC(10,2) DEFAULT NULL,
  notes           TEXT NOT NULL DEFAULT '',
  order_id        BIGINT DEFAULT NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  close_token     TEXT UNIQUE DEFAULT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comanda_items (
  id              BIGSERIAL PRIMARY KEY,
  comanda_id      BIGINT NOT NULL REFERENCES public.comandas(id) ON DELETE CASCADE,
  product_key     TEXT NOT NULL,
  product_name    TEXT NOT NULL,
  product_size    TEXT DEFAULT NULL,
  category        TEXT NOT NULL DEFAULT '',
  unit_price      NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_balcao_only  BOOLEAN NOT NULL DEFAULT false,
  observation     TEXT NOT NULL DEFAULT '',
  added_by        TEXT NOT NULL DEFAULT '',
  updated_by      TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comanda_history (
  id              BIGSERIAL PRIMARY KEY,
  comanda_id      BIGINT NOT NULL REFERENCES public.comandas(id) ON DELETE CASCADE,
  action          TEXT NOT NULL CHECK (action IN ('opened', 'item_added', 'item_updated', 'item_removed', 'notes_updated', 'closed')),
  product_name    TEXT DEFAULT NULL,
  old_quantity    INTEGER DEFAULT NULL,
  new_quantity    INTEGER DEFAULT NULL,
  unit_price      NUMERIC(10,2) DEFAULT NULL,
  details         TEXT NOT NULL DEFAULT '',
  actor_email     TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comandas_status_opened ON public.comandas(status, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_comandas_closed_at     ON public.comandas(closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_comanda_items_comanda  ON public.comanda_items(comanda_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comanda_history_cmd    ON public.comanda_history(comanda_id, created_at DESC);

-- Replica identity FULL para Realtime enviar comanda_id em eventos DELETE/UPDATE
ALTER TABLE public.comandas REPLICA IDENTITY FULL;
ALTER TABLE public.comanda_items REPLICA IDENTITY FULL;

-- Trigger para gerar código único CMD-0001 automaticamente
CREATE OR REPLACE FUNCTION public.set_comanda_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR trim(NEW.code) = '' THEN
    NEW.code := 'CMD-' || LPAD(NEW.id::text, 4, '0');
  END IF;
  NEW.label := trim(NEW.label);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comandas_set_defaults ON public.comandas;
CREATE TRIGGER comandas_set_defaults
  BEFORE INSERT ON public.comandas
  FOR EACH ROW EXECUTE FUNCTION public.set_comanda_defaults();

DROP TRIGGER IF EXISTS comandas_updated_at ON public.comandas;
CREATE TRIGGER comandas_updated_at
  BEFORE UPDATE ON public.comandas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger para calcular subtotal do item automaticamente
CREATE OR REPLACE FUNCTION public.compute_comanda_item_subtotal()
RETURNS TRIGGER AS $$
BEGIN
  NEW.subtotal := ROUND(COALESCE(NEW.unit_price, 0) * GREATEST(COALESCE(NEW.quantity, 1), 1), 2);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comanda_items_compute_subtotal ON public.comanda_items;
CREATE TRIGGER comanda_items_compute_subtotal
  BEFORE INSERT OR UPDATE ON public.comanda_items
  FOR EACH ROW EXECUTE FUNCTION public.compute_comanda_item_subtotal();

-- Trigger para recalcular total e quantidade de itens da comanda automaticamente
CREATE OR REPLACE FUNCTION public.sync_comanda_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_comanda_id BIGINT;
BEGIN
  v_comanda_id := COALESCE(NEW.comanda_id, OLD.comanda_id);

  UPDATE public.comandas
  SET
    items_count = COALESCE((
      SELECT SUM(quantity)::INTEGER FROM public.comanda_items WHERE comanda_id = v_comanda_id
    ), 0),
    total_amount = COALESCE((
      SELECT ROUND(SUM(subtotal), 2) FROM public.comanda_items WHERE comanda_id = v_comanda_id
    ), 0),
    updated_at = NOW()
  WHERE id = v_comanda_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comanda_items_sync_totals ON public.comanda_items;
CREATE TRIGGER comanda_items_sync_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.comanda_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_comanda_totals();

-- RLS para Comandas, Itens e Histórico (apenas admins/garçons autenticados)
ALTER TABLE public.comandas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comanda_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comanda_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comandas_auth_all ON public.comandas;
CREATE POLICY comandas_auth_all ON public.comandas
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS comanda_items_auth_all ON public.comanda_items;
CREATE POLICY comanda_items_auth_all ON public.comanda_items
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS comanda_history_auth_all ON public.comanda_history;
CREATE POLICY comanda_history_auth_all ON public.comanda_history
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Publicação Realtime para sincronização simultânea entre celulares
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = 'comandas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comandas;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = 'comanda_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comanda_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime' AND n.nspname = 'public' AND c.relname = 'comanda_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comanda_history;
  END IF;
END $$;

-- ── RPCs ATÔMICAS PARA CONCORRÊNCIA SEGURA ENTRE GARÇONS ──

CREATE OR REPLACE FUNCTION public.open_comanda(
  p_label TEXT,
  p_notes TEXT DEFAULT ''
)
RETURNS public.comandas AS $$
DECLARE
  v_actor   TEXT;
  v_label   TEXT;
  v_comanda public.comandas;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autorizado.';
  END IF;

  v_label := trim(COALESCE(p_label, ''));
  IF v_label = '' THEN
    RAISE EXCEPTION 'A identificação da comanda é obrigatória.';
  END IF;

  v_actor := COALESCE(NULLIF(auth.jwt() ->> 'email', ''), 'Equipe');

  INSERT INTO public.comandas (code, label, status, opened_by, notes)
  VALUES ('', v_label, 'open', v_actor, trim(COALESCE(p_notes, '')))
  RETURNING * INTO v_comanda;

  INSERT INTO public.comanda_history (comanda_id, action, details, actor_email)
  VALUES (v_comanda.id, 'opened', 'Comanda aberta: ' || v_label, v_actor);

  RETURN v_comanda;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.add_comanda_item(
  p_comanda_id     BIGINT,
  p_product_key    TEXT,
  p_product_name   TEXT,
  p_product_size   TEXT DEFAULT NULL,
  p_category       TEXT DEFAULT '',
  p_unit_price     NUMERIC DEFAULT 0,
  p_quantity       INTEGER DEFAULT 1,
  p_is_balcao_only BOOLEAN DEFAULT false,
  p_observation    TEXT DEFAULT ''
)
RETURNS public.comandas AS $$
DECLARE
  v_actor    TEXT;
  v_comanda  public.comandas;
  v_existing public.comanda_items;
  v_obs      TEXT;
  v_price    NUMERIC(10,2);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autorizado.';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser maior que zero.';
  END IF;

  v_price := ROUND(COALESCE(p_unit_price, 0), 2);
  IF v_price < 0 THEN
    RAISE EXCEPTION 'Preço inválido.';
  END IF;

  v_actor := COALESCE(NULLIF(auth.jwt() ->> 'email', ''), 'Equipe');
  v_obs := trim(COALESCE(p_observation, ''));

  SELECT * INTO v_comanda
  FROM public.comandas
  WHERE id = p_comanda_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda não encontrada.';
  END IF;

  IF v_comanda.status <> 'open' THEN
    RAISE EXCEPTION 'Comanda fechada não pode receber novos lançamentos.';
  END IF;

  SELECT * INTO v_existing
  FROM public.comanda_items
  WHERE comanda_id = p_comanda_id
    AND product_key = p_product_key
    AND unit_price = v_price
    AND observation = v_obs
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.comanda_items
    SET
      quantity   = v_existing.quantity + p_quantity,
      updated_by = v_actor
    WHERE id = v_existing.id;

    INSERT INTO public.comanda_history (
      comanda_id, action, product_name, old_quantity, new_quantity, unit_price, details, actor_email
    ) VALUES (
      p_comanda_id,
      'item_added',
      p_product_name,
      v_existing.quantity,
      v_existing.quantity + p_quantity,
      v_price,
      '+' || p_quantity || 'x ' || p_product_name || CASE WHEN v_obs <> '' THEN ' (' || v_obs || ')' ELSE '' END,
      v_actor
    );
  ELSE
    INSERT INTO public.comanda_items (
      comanda_id, product_key, product_name, product_size, category,
      unit_price, quantity, is_balcao_only, observation, added_by, updated_by
    ) VALUES (
      p_comanda_id, p_product_key, trim(p_product_name), NULLIF(trim(COALESCE(p_product_size, '')), ''),
      trim(COALESCE(p_category, '')), v_price, p_quantity, COALESCE(p_is_balcao_only, false),
      v_obs, v_actor, v_actor
    );

    INSERT INTO public.comanda_history (
      comanda_id, action, product_name, old_quantity, new_quantity, unit_price, details, actor_email
    ) VALUES (
      p_comanda_id,
      'item_added',
      p_product_name,
      0,
      p_quantity,
      v_price,
      '+' || p_quantity || 'x ' || p_product_name || CASE WHEN v_obs <> '' THEN ' (' || v_obs || ')' ELSE '' END,
      v_actor
    );
  END IF;

  SELECT * INTO v_comanda FROM public.comandas WHERE id = p_comanda_id;
  RETURN v_comanda;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_comanda_item_qty(
  p_item_id      BIGINT,
  p_new_quantity INTEGER
)
RETURNS public.comandas AS $$
DECLARE
  v_actor   TEXT;
  v_item    public.comanda_items;
  v_comanda public.comandas;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autorizado.';
  END IF;

  v_actor := COALESCE(NULLIF(auth.jwt() ->> 'email', ''), 'Equipe');

  SELECT * INTO v_item FROM public.comanda_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item da comanda não encontrado.';
  END IF;

  SELECT * INTO v_comanda
  FROM public.comandas
  WHERE id = v_item.comanda_id
  FOR UPDATE;

  IF v_comanda.status <> 'open' THEN
    RAISE EXCEPTION 'Comanda fechada não pode ser alterada.';
  END IF;

  IF p_new_quantity IS NULL OR p_new_quantity <= 0 THEN
    DELETE FROM public.comanda_items WHERE id = p_item_id;

    INSERT INTO public.comanda_history (
      comanda_id, action, product_name, old_quantity, new_quantity, unit_price, details, actor_email
    ) VALUES (
      v_comanda.id,
      'item_removed',
      v_item.product_name,
      v_item.quantity,
      0,
      v_item.unit_price,
      'Removido ' || v_item.quantity || 'x ' || v_item.product_name,
      v_actor
    );
  ELSE
    UPDATE public.comanda_items
    SET quantity = p_new_quantity, updated_by = v_actor
    WHERE id = p_item_id;

    IF v_item.quantity <> p_new_quantity THEN
      INSERT INTO public.comanda_history (
        comanda_id, action, product_name, old_quantity, new_quantity, unit_price, details, actor_email
      ) VALUES (
        v_comanda.id,
        'item_updated',
        v_item.product_name,
        v_item.quantity,
        p_new_quantity,
        v_item.unit_price,
        'Qtd alterada: ' || v_item.product_name || ' (' || v_item.quantity || ' → ' || p_new_quantity || ')',
        v_actor
      );
    END IF;
  END IF;

  SELECT * INTO v_comanda FROM public.comandas WHERE id = v_comanda.id;
  RETURN v_comanda;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.remove_comanda_item(p_item_id BIGINT)
RETURNS public.comandas AS $$
BEGIN
  RETURN public.update_comanda_item_qty(p_item_id, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_comanda_notes(
  p_comanda_id BIGINT,
  p_notes      TEXT DEFAULT ''
)
RETURNS public.comandas AS $$
DECLARE
  v_actor   TEXT;
  v_comanda public.comandas;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autorizado.';
  END IF;

  v_actor := COALESCE(NULLIF(auth.jwt() ->> 'email', ''), 'Equipe');

  SELECT * INTO v_comanda FROM public.comandas WHERE id = p_comanda_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda não encontrada.';
  END IF;
  IF v_comanda.status <> 'open' THEN
    RAISE EXCEPTION 'Comanda fechada não pode ser alterada.';
  END IF;

  UPDATE public.comandas
  SET notes = trim(COALESCE(p_notes, '')), updated_at = NOW()
  WHERE id = p_comanda_id
  RETURNING * INTO v_comanda;

  INSERT INTO public.comanda_history (comanda_id, action, details, actor_email)
  VALUES (p_comanda_id, 'notes_updated', 'Observação da comanda atualizada', v_actor);

  RETURN v_comanda;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.delete_empty_comanda(p_comanda_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  v_comanda public.comandas;
  v_count   INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autorizado.';
  END IF;

  SELECT * INTO v_comanda FROM public.comandas WHERE id = p_comanda_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_comanda.status <> 'open' THEN
    RAISE EXCEPTION 'Não é possível excluir uma comanda já fechada.';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_count FROM public.comanda_items WHERE comanda_id = p_comanda_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Remova os itens da comanda antes de cancelá-la.';
  END IF;

  DELETE FROM public.comandas WHERE id = p_comanda_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.close_comanda(
  p_comanda_id     BIGINT,
  p_payment_method TEXT DEFAULT 'PIX',
  p_change_for     NUMERIC DEFAULT NULL,
  p_notes          TEXT DEFAULT '',
  p_close_token    TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_actor      TEXT;
  v_comanda    public.comandas;
  v_order      public.orders;
  v_items_json JSONB;
  v_total      NUMERIC(10,2);
  v_items_cnt  INTEGER;
  v_payment    TEXT;
  v_notes      TEXT;
  v_token      TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autorizado.';
  END IF;

  v_actor := COALESCE(NULLIF(auth.jwt() ->> 'email', ''), 'Equipe');
  v_token := NULLIF(trim(COALESCE(p_close_token, '')), '');

  -- Idempotência: se o mesmo token de fechamento já concluiu a operação, retorna o resultado existente
  IF v_token IS NOT NULL THEN
    SELECT * INTO v_comanda FROM public.comandas WHERE close_token = v_token;
    IF FOUND AND v_comanda.status = 'closed' AND v_comanda.order_id IS NOT NULL THEN
      SELECT * INTO v_order FROM public.orders WHERE id = v_comanda.order_id;
      RETURN jsonb_build_object(
        'comanda', to_jsonb(v_comanda),
        'order', to_jsonb(v_order),
        'already_closed', true
      );
    END IF;
  END IF;

  -- Trava exclusiva na linha da comanda para evitar fechamento duplicado simultâneo
  SELECT * INTO v_comanda
  FROM public.comandas
  WHERE id = p_comanda_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda não encontrada.';
  END IF;

  IF v_comanda.status <> 'open' THEN
    RAISE EXCEPTION 'Esta comanda já foi fechada.';
  END IF;

  SELECT
    COALESCE(SUM(quantity), 0)::INTEGER,
    COALESCE(ROUND(SUM(subtotal), 2), 0),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'name', product_name,
          'size', product_size,
          'quantity', quantity,
          'price', unit_price,
          'extras', '[]'::jsonb,
          'observation', CASE
            WHEN observation <> '' THEN observation
            WHEN is_balcao_only THEN 'Item de balcão'
            ELSE NULL
          END
        )
        ORDER BY created_at ASC, id ASC
      ),
      '[]'::jsonb
    )
  INTO v_items_cnt, v_total, v_items_json
  FROM public.comanda_items
  WHERE comanda_id = p_comanda_id;

  IF v_items_cnt <= 0 THEN
    RAISE EXCEPTION 'Não é possível fechar uma comanda sem produtos lançados.';
  END IF;

  v_payment := COALESCE(NULLIF(trim(p_payment_method), ''), 'PIX');
  v_notes := trim(CONCAT_WS(' - ',
    '[COMANDA ' || v_comanda.code || ']',
    NULLIF(trim(COALESCE(p_notes, '')), ''),
    CASE WHEN NULLIF(trim(COALESCE(p_notes, '')), '') IS NULL THEN NULLIF(trim(v_comanda.notes), '') ELSE NULL END
  ));

  -- Registra a venda definitivamente no sistema financeiro existente (public.orders)
  INSERT INTO public.orders (
    customer_name,
    customer_phone,
    street,
    number,
    district,
    items,
    total,
    payment_method,
    change_for,
    status,
    notes
  ) VALUES (
    v_comanda.label,
    '',
    'Consumo no Balcão',
    v_comanda.code,
    'Presencial',
    v_items_json,
    v_total,
    v_payment,
    p_change_for,
    'delivered',
    v_notes
  )
  RETURNING * INTO v_order;

  -- Atualiza status da comanda para fechada e vincula ao pedido financeiro
  UPDATE public.comandas
  SET
    status         = 'closed',
    closed_by      = v_actor,
    closed_at      = NOW(),
    payment_method = v_payment,
    change_for     = p_change_for,
    notes          = COALESCE(NULLIF(trim(COALESCE(p_notes, '')), ''), v_comanda.notes),
    order_id       = v_order.id,
    close_token    = v_token,
    items_count    = v_items_cnt,
    total_amount   = v_total,
    updated_at     = NOW()
  WHERE id = p_comanda_id
  RETURNING * INTO v_comanda;

  INSERT INTO public.comanda_history (
    comanda_id, action, details, actor_email
  ) VALUES (
    p_comanda_id,
    'closed',
    'Conta fechada (' || v_payment || ') • Venda #' || v_order.id || ' • Total R$ ' || TO_CHAR(v_total, 'FM9999990.00'),
    v_actor
  );

  RETURN jsonb_build_object(
    'comanda', to_jsonb(v_comanda),
    'order', to_jsonb(v_order),
    'already_closed', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.open_comanda(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_comanda_item(BIGINT, TEXT, TEXT, TEXT, TEXT, NUMERIC, INTEGER, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_comanda_item_qty(BIGINT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_comanda_item(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_comanda_notes(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_empty_comanda(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_comanda(BIGINT, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
