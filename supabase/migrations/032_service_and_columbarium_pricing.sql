-- ============================================================
-- Migration 032: Service & Columbarium Pricing Config
--
-- 1. columbarium_level_prices — admin-editable per-level pricing
--    (6 rows, one per row, replaces hardcoded ROW_PRICES constant)
--
-- 2. funeral_service_config — admin-editable config for
--    Traditional Burial and Cremation service pages
--    Stores JSON arrays for packages/urns and hero images.
--
-- SAFE TO RUN ON A LIVE DB — only additive changes
-- ============================================================

-- ── 1. Columbarium level prices ──────────────────────────────
-- One row per columbarium row (1–6), admin can edit the price.
CREATE TABLE IF NOT EXISTS public.columbarium_level_prices (
  row_number   smallint    PRIMARY KEY CHECK (row_number BETWEEN 1 AND 6),
  label        text        NOT NULL,
  price        numeric(10,2) NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid        REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE OR REPLACE TRIGGER columbarium_level_prices_updated_at
  BEFORE UPDATE ON public.columbarium_level_prices
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.columbarium_level_prices ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed in the public columbarium page)
CREATE POLICY "Anyone can read columbarium level prices"
  ON public.columbarium_level_prices FOR SELECT
  USING (true);

-- Only admins can change level prices
CREATE POLICY "Admins can update columbarium level prices"
  ON public.columbarium_level_prices FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed the 6 rows with current hardcoded defaults
INSERT INTO public.columbarium_level_prices (row_number, label, price) VALUES
  (1, 'Top Level',         25000.00),
  (2, 'Eye Level (Upper)', 35000.00),
  (3, 'Eye Level (Lower)', 25000.00),
  (4, 'Upper Bottom',      20000.00),
  (5, 'Lower Bottom',      20000.00),
  (6, 'Ground Level',      20000.00)
ON CONFLICT (row_number) DO NOTHING;


-- ── 2. Funeral service config ─────────────────────────────────
-- Stores editable config for Traditional Burial and Cremation pages.
-- service_key: 'traditional' or 'cremation'
-- packages_json: JSON array of package objects
-- hero_image_path: Supabase Storage path for the hero image
CREATE TABLE IF NOT EXISTS public.funeral_service_config (
  service_key     text        PRIMARY KEY,  -- 'traditional' | 'cremation'
  packages_json   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  hero_image_path text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT funeral_service_key_check CHECK (service_key IN ('traditional', 'cremation'))
);

CREATE OR REPLACE TRIGGER funeral_service_config_updated_at
  BEFORE UPDATE ON public.funeral_service_config
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.funeral_service_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read (used on public service pages)
CREATE POLICY "Anyone can read funeral service config"
  ON public.funeral_service_config FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update funeral service config"
  ON public.funeral_service_config FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can insert funeral service config"
  ON public.funeral_service_config FOR INSERT
  WITH CHECK (public.is_admin());

-- Seed traditional burial config (mirrors current PACKAGES constant)
INSERT INTO public.funeral_service_config (service_key, packages_json) VALUES (
  'traditional',
  '[
    {"title":"OMB","price":25000,"imageSrc":"/traditional/OMB.png","features":["CASKET","EMBALMING","FLOWER","LIGHTENING","2 PCS CANDLES","15 PCS. CHAIRS","TARPLIN 2X3","PICTURE W/FRAME","PLAYING CARDS 6 PCS","GUEST BOOK","FULL OUT BAN","CARO"]},
    {"title":"HALF GLASS","price":35000,"imageSrc":"/traditional/HALFGLASS.png","features":["CASKET","EMBALMING","FLOWERS","LIGHTENING","4 PCS CANDLE","20 CHAIRS","CARO","100 PCS BOTTLED WATER","TARPAULIN 2X3","PICTURE W/FRAME","1 BOX PLAYING CARDS","GUEST BOOK","FULL OUT BAN","WATER DISPENSER W/ 10 GALLON"]},
    {"title":"JR FULL GLASS","price":47000,"imageSrc":"/traditional/JRFULL%20GGLASS.png","features":["CASKET","EMBALMING","FLOWER W/ 1 REPLACEMENT","LIGHTENING","4 CANDLES","20 CHAIRS TENT","WATER DISPENSER W/ 10 GALLON","1 BOX PLAYING CARDS","GUEST BOOK","PICTURE W/ FRAME","TARPAULIN 2X3","100 PCS BOTTLED WATER","VIGIL LAST NIGHT","FULL OUT VAN","CARO"]},
    {"title":"SR FULL GLASS","price":57000,"imageSrc":"/traditional/SRFULLGLASS.png","features":["CASKET","EMBALMING","FLOWER W/ 1 REPLACEMENT","LIGHTENING","WATER DISPENSER W/ 10 GALLON","1 BOX PLAYING CARDS","GUEST BOOK","20 CHAIRS TENT","4 CANDLES","TARPAULIN 2X3","PICTURE W/ FRAME","VIGIL LAST NIGHT","100 PCS BOTTLED WATER","RADUS","CARO","FULL OUT VAN"]},
    {"title":"ORDINARY METAL","price":75000,"imageSrc":"/traditional/ORDINARYMETAL.png","features":["CASKET","EMBALMING","LIGHTENING","FLOWERS (2 LAGAY)","4 CANDLES","20 CHAIRS","WATER DISPENSER W/ 10 GALLON","1 BOX PLAYING CARDS","GUEST BOOK","TENT","PICTURE W/ FRAME","TARPAULIN 4X5","VIGIL LAST NIGHT","100 PCS CUPCAKE","100 PCS BOTTLED WATER","100 PCS COKE MISMO","FULL OUT VAN","KARWAHE","RADUS/ ROSE"]}
  ]'::jsonb
) ON CONFLICT (service_key) DO NOTHING;

-- Seed cremation config (mirrors current URNS constant + base price)
INSERT INTO public.funeral_service_config (service_key, packages_json) VALUES (
  'cremation',
  '[
    {"name":"Wooden Urn","description":"Warm wooden finish — simple and dignified.","price":3500,"image":"/urns/wooden.png"},
    {"name":"Black Metal Urn","description":"Refined dark design — timeless and understated.","price":3500,"image":"/urns/blackmetal.png"},
    {"name":"Gray Metal Urn","description":"Graceful metallic style — calm and elegant.","price":5500,"image":"/urns/graymetal.png"},
    {"name":"White Marble Urn","description":"Soft marble-inspired finish — reflects purity.","price":5500,"image":"/urns/whitemarble.png"},
    {"name":"Blue Metal Urn","description":"Distinguished blue — premium memorial design.","price":15000,"image":"/urns/blue.png"},
    {"name":"Brown Metal Urn","description":"Rich bronze-brown — traditional memorial style.","price":15000,"image":"/urns/brownmetal.png"}
  ]'::jsonb
) ON CONFLICT (service_key) DO NOTHING;


-- ── 3. Service assets storage bucket ─────────────────────────
-- Stores uploaded images for funeral service packages and urns.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-assets',
  'service-assets',
  true,
  5242880,  -- 5 MB max per file
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read (images shown on the public service pages)
CREATE POLICY "Public read service-assets bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-assets');

-- Only admins can upload/update/delete service asset images
CREATE POLICY "Admins can upload service assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-assets'
    AND public.is_admin()
  );

CREATE POLICY "Admins can update service assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'service-assets'
    AND public.is_admin()
  );

CREATE POLICY "Admins can delete service assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-assets'
    AND public.is_admin()
  );
