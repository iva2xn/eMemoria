// ── Shared service constants ──────────────────────────────────
// Fallback data used when the funeral_service_config DB rows are
// empty or unavailable. These mirror the migration 032 seed data.

import type { CremationUrn, TraditionalPackage } from '@/lib/supabase/types'

export const FALLBACK_URNS: CremationUrn[] = [
  { name: 'Wooden Urn',       description: 'Warm wooden finish — simple and dignified.',       price: 3500,  image: '/urns/wooden.png' },
  { name: 'Black Metal Urn',  description: 'Refined dark design — timeless and understated.',  price: 3500,  image: '/urns/blackmetal.png' },
  { name: 'Gray Metal Urn',   description: 'Graceful metallic style — calm and elegant.',      price: 5500,  image: '/urns/graymetal.png' },
  { name: 'White Marble Urn', description: 'Soft marble-inspired finish — reflects purity.',   price: 5500,  image: '/urns/whitemarble.png' },
  { name: 'Blue Metal Urn',   description: 'Distinguished blue — premium memorial design.',    price: 15000, image: '/urns/blue.png' },
  { name: 'Brown Metal Urn',  description: 'Rich bronze-brown — traditional memorial style.',  price: 15000, image: '/urns/brownmetal.png' },
]

export const FALLBACK_PACKAGES: TraditionalPackage[] = [
  {
    title: 'OMB', price: 25000, imageSrc: '/traditional/OMB.png',
    features: ['CASKET','EMBALMING','FLOWER','LIGHTENING','2 PCS CANDLES','15 PCS. CHAIRS','TARPLIN 2X3','PICTURE W/FRAME','PLAYING CARDS 6 PCS','GUEST BOOK','FULL OUT BAN','CARO'],
  },
  {
    title: 'HALF GLASS', price: 35000, imageSrc: '/traditional/HALFGLASS.png',
    features: ['CASKET','EMBALMING','FLOWERS','LIGHTENING','4 PCS CANDLE','20 CHAIRS','CARO','100 PCS BOTTLED WATER','TARPAULIN 2X3','PICTURE W/FRAME','1 BOX PLAYING CARDS','GUEST BOOK','FULL OUT BAN','WATER DISPENSER W/ 10 GALLON'],
  },
  {
    title: 'JR FULL GLASS', price: 47000, imageSrc: '/traditional/JRFULL%20GGLASS.png',
    features: ['CASKET','EMBALMING','FLOWER W/ 1 REPLACEMENT','LIGHTENING','4 CANDLES','20 CHAIRS TENT','WATER DISPENSER W/ 10 GALLON','1 BOX PLAYING CARDS','GUEST BOOK','PICTURE W/ FRAME','TARPAULIN 2X3','100 PCS BOTTLED WATER','VIGIL LAST NIGHT','FULL OUT VAN','CARO'],
  },
  {
    title: 'SR FULL GLASS', price: 57000, imageSrc: '/traditional/SRFULLGLASS.png',
    features: ['CASKET','EMBALMING','FLOWER W/ 1 REPLACEMENT','LIGHTENING','WATER DISPENSER W/ 10 GALLON','1 BOX PLAYING CARDS','GUEST BOOK','20 CHAIRS TENT','4 CANDLES','TARPAULIN 2X3','PICTURE W/ FRAME','VIGIL LAST NIGHT','100 PCS BOTTLED WATER','RADUS','CARO','FULL OUT VAN'],
  },
  {
    title: 'ORDINARY METAL', price: 75000, imageSrc: '/traditional/ORDINARYMETAL.png',
    features: ['CASKET','EMBALMING','LIGHTENING','FLOWERS (2 LAGAY)','4 CANDLES','20 CHAIRS','WATER DISPENSER W/ 10 GALLON','1 BOX PLAYING CARDS','GUEST BOOK','TENT','PICTURE W/ FRAME','TARPAULIN 4X5','VIGIL LAST NIGHT','100 PCS CUPCAKE','100 PCS BOTTLED WATER','100 PCS COKE MISMO','FULL OUT VAN','KARWAHE','RADUS/ ROSE'],
  },
]
