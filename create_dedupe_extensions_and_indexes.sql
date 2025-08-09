-- One-time extensions (safe to rerun)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_contacts_email_norm   ON contacts (email_norm);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_e164   ON contacts (phone_e164);
CREATE INDEX IF NOT EXISTS idx_contacts_website_root ON contacts (website_root);
CREATE INDEX IF NOT EXISTS idx_contacts_email_domain ON contacts (email_domain);
CREATE INDEX IF NOT EXISTS idx_contacts_zip_norm     ON contacts (zip_norm);

-- Trigram GIN indexes
CREATE INDEX IF NOT EXISTS gin_contacts_fullname_trgm ON contacts USING GIN (full_name_norm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gin_contacts_company_trgm  ON contacts USING GIN (company_norm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gin_contacts_address_trgm  ON contacts USING GIN (address_norm gin_trgm_ops);

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_website_root ON companies (website_root);
CREATE INDEX IF NOT EXISTS idx_companies_name_norm    ON companies (name_norm);


