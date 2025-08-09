-- Safe, idempotent DDL to add dedupe-related schema
-- You can run this via psql or your DB console

-- Extensions (safe to rerun)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  name_norm TEXT,
  website TEXT,
  website_root TEXT,
  domain_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_website_root ON companies(website_root);
CREATE INDEX IF NOT EXISTS idx_companies_name_norm ON companies(name_norm);

-- Contacts alterations
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_name_norm TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name_norm TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS full_name_norm TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_norm TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_local TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_domain TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_e164 TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_norm TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS website_root TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_norm TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS zip_norm TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS soundex_last TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS metaphone_last TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS other_emails TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS other_phones TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id INTEGER;

-- FK to companies (if already exists, our script will ignore the error)
ALTER TABLE contacts ADD CONSTRAINT contacts_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_contacts_email_norm   ON contacts (email_norm);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_e164   ON contacts (phone_e164);
CREATE INDEX IF NOT EXISTS idx_contacts_website_root ON contacts (website_root);
CREATE INDEX IF NOT EXISTS idx_contacts_email_domain ON contacts (email_domain);
CREATE INDEX IF NOT EXISTS idx_contacts_zip_norm     ON contacts (zip_norm);

-- Trigram GIN indexes
CREATE INDEX IF NOT EXISTS gin_contacts_fullname_trgm ON contacts USING GIN (full_name_norm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gin_contacts_company_trgm  ON contacts USING GIN (company_norm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gin_contacts_address_trgm  ON contacts USING GIN (address_norm gin_trgm_ops);

-- Dedupe tables
CREATE TABLE IF NOT EXISTS dedupe_candidates (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL DEFAULT 'contact',
  id1 BIGINT NOT NULL,
  id2 BIGINT NOT NULL,
  score NUMERIC(5,3) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, id1, id2)
);

CREATE TABLE IF NOT EXISTS dedupe_merges (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  survivor_id BIGINT NOT NULL,
  merged_id BIGINT NOT NULL,
  score NUMERIC(5,3),
  mode TEXT NOT NULL,
  performed_by TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_queue (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_job_queue_type_status ON job_queue(type, status);


