-- ────────────────────────────────────────────────────────────────────────────
-- Migration 040: Funeral Add-ons System
-- Adds:
--   1. funeral_addons — admin-managed catalog of purchasable add-ons
--      (only applicable to traditional service clients)
--   2. addon_orders   — a client's add-on order request
--   3. addon_order_items — line items within an order
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1. Catalog ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS funeral_addons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text    NOT NULL,
  description  text    NOT NULL DEFAULT '',
  price        numeric NOT NULL CHECK (price >= 0),
  image_path   text    NOT NULL DEFAULT '',
  max_qty      int     NOT NULL DEFAULT 99,   -- 99 = unlimited
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   int     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Seed default add-ons ───────────────────────────────────────────────────
INSERT INTO funeral_addons (name, description, price, image_path, max_qty, sort_order) VALUES
  ('Additional Flower Basket',    'Extra flower basket arrangement for the viewing area.',                              500,   '/addons/flower-basket.png',  99, 1),
  ('Additional Flower Stand',     'Tall standing flower arrangement for the wake venue.',                             1000,  '/addons/flower-stand.png',   99, 2),
  ('Additional Light Stands',     'Decorative light stands to illuminate the wake venue.',                            1000,  '/addons/light-stand.png',     2, 3),
  ('White Doves',                 'White dove release ceremony at the burial site.',                                   300,  '/addons/white-doves.png',    99, 4),
  ('Live Musicians / Band',       'Live musical performance during the vigil and procession to the cemetery.',        5000,  '/addons/musicians.png',       1, 5),
  ('Small Remembrance Tokens',    'Pack of 12 small remembrance tokens for distribution to wake visitors.',           500,  '/addons/tokens.png',         99, 6)
ON CONFLICT DO NOTHING;

-- ── 2. Orders ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'addon_order_status') THEN
    CREATE TYPE addon_order_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'paid',
      'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS addon_orders (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_submission_id  uuid REFERENCES document_submissions(id) ON DELETE SET NULL,
  status                  addon_order_status NOT NULL DEFAULT 'pending',
  total_amount            numeric NOT NULL DEFAULT 0,
  rejection_reason        text,
  reviewed_by             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at             timestamptz,
  payment_id              uuid REFERENCES payments(id) ON DELETE SET NULL,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Order Line Items ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addon_order_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES addon_orders(id) ON DELETE CASCADE,
  addon_id    uuid NOT NULL REFERENCES funeral_addons(id) ON DELETE RESTRICT,
  quantity    int  NOT NULL CHECK (quantity > 0),
  unit_price  numeric NOT NULL,   -- price at the time of order (snapshot)
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Timestamps trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'funeral_addons_updated_at') THEN
    CREATE TRIGGER funeral_addons_updated_at BEFORE UPDATE ON funeral_addons
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'addon_orders_updated_at') THEN
    CREATE TRIGGER addon_orders_updated_at BEFORE UPDATE ON addon_orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE funeral_addons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_order_items  ENABLE ROW LEVEL SECURITY;

-- funeral_addons: public read, admin/staff write
CREATE POLICY "addons_read_all"   ON funeral_addons FOR SELECT USING (true);
CREATE POLICY "addons_write_staff" ON funeral_addons FOR ALL
  USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());

-- addon_orders: owners and admin/staff see them
CREATE POLICY "addon_orders_owner_read" ON addon_orders FOR SELECT
  USING (auth.uid() = user_id OR is_staff_or_admin());
CREATE POLICY "addon_orders_owner_insert" ON addon_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addon_orders_owner_update_cancel" ON addon_orders FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "addon_orders_staff_update" ON addon_orders FOR UPDATE
  USING (is_staff_or_admin());

-- addon_order_items: follow parent order access
CREATE POLICY "addon_items_owner_read" ON addon_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM addon_orders o
      WHERE o.id = addon_order_items.order_id
        AND (o.user_id = auth.uid() OR is_staff_or_admin())
    )
  );
CREATE POLICY "addon_items_owner_insert" ON addon_order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM addon_orders o
      WHERE o.id = addon_order_items.order_id AND o.user_id = auth.uid()
    )
  );
CREATE POLICY "addon_items_owner_delete" ON addon_order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM addon_orders o
      WHERE o.id = addon_order_items.order_id AND o.user_id = auth.uid()
        AND o.status = 'pending'
    )
  );
