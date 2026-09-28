-- ============================================================
-- Migration 035: Ensure pricing tables are seeded
--
-- Idempotent upserts so prices are always present even if
-- migration 032 was applied before the tables existed or
-- if seed rows were accidentally deleted.
-- ============================================================

-- ── 1. Columbarium level prices ──────────────────────────────
INSERT INTO public.columbarium_level_prices (row_number, label, price) VALUES
  (1, 'Top Level',         25000.00),
  (2, 'Eye Level (Upper)', 35000.00),
  (3, 'Eye Level (Lower)', 25000.00),
  (4, 'Upper Bottom',      20000.00),
  (5, 'Lower Bottom',      20000.00),
  (6, 'Ground Level',      20000.00)
ON CONFLICT (row_number) DO NOTHING;

-- ── 2. Wake extension price config ───────────────────────────
INSERT INTO public.wake_extension_price_config (id, price_per_day)
  VALUES (1, 500.00)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Traditional burial packages ───────────────────────────
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

-- ── 4. Cremation service config ───────────────────────────────
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
