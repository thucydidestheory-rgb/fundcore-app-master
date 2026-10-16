-- FundCore — DDL Postgres produksi (PRD §10, §9.2).
-- Mode file bawaan (data/db.json) memakai nama kolom yang SAMA agar migrasi
-- tinggal mengganti lapisan store.ts. Index & counter sesuai strategi skala.
-- Jalankan: psql $DATABASE_URL -f db/postgres.sql

CREATE TABLE IF NOT EXISTS site_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'PeduliBersama',
  tagline TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '/logo.svg',
  favicon_url TEXT NOT NULL DEFAULT '/favicon.svg',
  color_bg CHAR(7) NOT NULL DEFAULT '#ffffff',
  color_brand CHAR(7) NOT NULL DEFAULT '#0e7c5b',
  color_accent CHAR(7) NOT NULL DEFAULT '#f97316',
  org_name TEXT NOT NULL DEFAULT '',
  org_address TEXT NOT NULL DEFAULT '',
  org_contact TEXT NOT NULL DEFAULT '',
  social_instagram TEXT NOT NULL DEFAULT '',
  social_tiktok TEXT NOT NULL DEFAULT '',
  social_facebook TEXT NOT NULL DEFAULT '',
  social_youtube TEXT NOT NULL DEFAULT '',
  sk_kemenkumham TEXT NOT NULL DEFAULT '',
  akta TEXT NOT NULL DEFAULT '',
  nib TEXT NOT NULL DEFAULT '',
  platform_fee_pct NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  min_donation INTEGER NOT NULL DEFAULT 10000,
  invoice_expiry_hours INTEGER NOT NULL DEFAULT 24,
  followup_delay_minutes INTEGER NOT NULL DEFAULT 120,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'donor' CHECK (role IN ('super_admin','operator','finance','viewer','fundraiser','donor')),
  fundraiser_status TEXT NOT NULL DEFAULT 'none' CHECK (fundraiser_status IN ('none','pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, icon TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  owner_name TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT true,
  title TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  target_amount BIGINT NOT NULL CHECK (target_amount > 0),
  collected_amount BIGINT NOT NULL DEFAULT 0,   -- counter denormalisasi (PRD §9.2)
  donor_count INTEGER NOT NULL DEFAULT 0,       -- counter denormalisasi
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','finished','frozen')),
  urgent BOOLEAN NOT NULL DEFAULT false,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ NOT NULL,
  cover_url TEXT NOT NULL DEFAULT '',
  story TEXT NOT NULL DEFAULT '',
  receiver TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_donation_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_campaigns_list ON campaigns (status, category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns (slug);

-- PARTISI per bulan begitu >5jt baris (PRD §9.2); mulai sebagai tabel biasa:
CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  donor_name TEXT NOT NULL,
  donor_phone TEXT NOT NULL,            -- enkripsi di level aplikasi (UU PDP)
  donor_email TEXT,
  amount BIGINT NOT NULL CHECK (amount > 0),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  prayer TEXT,
  aamiin_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','pending','paid','expired','failed')),
  channel TEXT,
  invoice_ref TEXT UNIQUE NOT NULL,     -- idempotency key callback
  invoice_url TEXT,
  wa_account_id TEXT,
  gateway_fee BIGINT NOT NULL DEFAULT 0,
  platform_fee BIGINT NOT NULL DEFAULT 0,
  net_amount BIGINT NOT NULL DEFAULT 0,
  utm_source TEXT,
  history_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_donations_campaign_paid ON donations (campaign_id, status, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_ref ON donations (invoice_ref);
CREATE INDEX IF NOT EXISTS idx_donations_paid_recent ON donations (status, paid_at DESC) WHERE status = 'paid';

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  donation_id TEXT NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'winpay',
  provider_uuid TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_request TEXT,
  raw_callback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wa_accounts (
  id TEXT PRIMARY KEY, label TEXT NOT NULL, base_url TEXT NOT NULL DEFAULT '',
  session TEXT NOT NULL, api_key TEXT NOT NULL DEFAULT '',  -- simpan terenkripsi
  phone TEXT, profile_name TEXT, status TEXT NOT NULL DEFAULT 'disconnected',
  is_active BOOLEAN NOT NULL DEFAULT true, last_checked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wa_settings (
  type TEXT PRIMARY KEY CHECK (type IN ('created','success','followup')),
  is_active BOOLEAN NOT NULL DEFAULT true, template TEXT NOT NULL DEFAULT '', delay_minutes INTEGER NOT NULL DEFAULT 120
);

CREATE TABLE IF NOT EXISTS wa_messages (
  id TEXT PRIMARY KEY, donation_id TEXT NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, wa_account_id TEXT, to_phone TEXT NOT NULL, payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(), sent_at TIMESTAMPTZ, error TEXT
);
CREATE INDEX IF NOT EXISTS idx_wa_due ON wa_messages (status, scheduled_at) WHERE status = 'queued';

CREATE TABLE IF NOT EXISTS disbursements (
  id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  amount BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'requested',
  proof_url TEXT, note TEXT, requested_by TEXT NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(), approved_by TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS fundraiser_applications (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL, doc_type TEXT NOT NULL, doc_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', note TEXT,
  reviewed_by TEXT REFERENCES users(id), reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_platform_stats (
  day DATE PRIMARY KEY, gross BIGINT NOT NULL DEFAULT 0, gateway_fee BIGINT NOT NULL DEFAULT 0,
  platform_fee BIGINT NOT NULL DEFAULT 0, net BIGINT NOT NULL DEFAULT 0,
  donation_count INTEGER NOT NULL DEFAULT 0, paid_count INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0, checkouts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, action TEXT NOT NULL,
  entity TEXT NOT NULL, before TEXT, after TEXT, ip TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_recent ON audit_logs (created_at DESC);
