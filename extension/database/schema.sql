-- Wedding Vendor Clips — Supabase / Postgres schema
-- Run this first, then seed.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS vendor_clips (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text        NOT NULL,
  domain         text,
  category       text        CHECK (category IN (
                   'photographer','venue','catering','florals','attire',
                   'cake','entertainment','tableware','transportation','stationery','other'
                 )),
  email          text,
  location       text,
  services       text,
  image_url      text,        -- og:image from the vendor page
  screenshot_url text,        -- full-page screenshot captured by the extension
  saved_at       timestamptz DEFAULT now(),
  created_at     timestamptz DEFAULT now()
);

-- Optional: index for fast category filtering (used by the board view)
CREATE INDEX IF NOT EXISTS vendor_clips_category_idx ON vendor_clips (category);
