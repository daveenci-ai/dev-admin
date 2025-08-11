-- Compute duplicate score between two contact ids
-- Requires extensions: pg_trgm, fuzzystrmatch, unaccent
-- Usage: SELECT * FROM score_pair(1,2);

CREATE OR REPLACE FUNCTION score_pair(a_id INT, b_id INT)
RETURNS TABLE (
  score NUMERIC,
  email_sim NUMERIC,
  phone_equal NUMERIC,
  name_sim NUMERIC,
  metaphone_match NUMERIC,
  company_sim NUMERIC,
  address_sim NUMERIC
) LANGUAGE sql STABLE AS $$
WITH a AS (
  SELECT c.*,
         lower(unaccent(regexp_replace(coalesce(c.name,''), '[^a-z0-9]+', ' ', 'gi'))) AS name_norm_fb,
         lower(split_part(coalesce(c.primary_email,''),'@',1)) AS email_local_raw,
         lower(split_part(coalesce(c.primary_email,''),'@',2)) AS email_domain_raw,
          (regexp_split_to_array(lower(unaccent(coalesce(c.name,''))),'\\s+'))[array_length(regexp_split_to_array(lower(unaccent(coalesce(c.name,''))),'\\s+'),1)] AS last_name_norm_calc
  FROM contacts c WHERE c.id = a_id
), a2 AS (
  SELECT *,
    regexp_replace(
      CASE WHEN email_domain_raw IN ('gmail.com','googlemail.com') THEN replace(email_local_raw,'.','') ELSE email_local_raw END,
      '\\+.*$',''
    ) AS email_local_norm,
    email_domain_raw AS email_domain_norm
  FROM a
), b AS (
  SELECT c.*,
         lower(unaccent(regexp_replace(coalesce(c.name,''), '[^a-z0-9]+', ' ', 'gi'))) AS name_norm_fb,
         lower(split_part(coalesce(c.primary_email,''),'@',1)) AS email_local_raw,
         lower(split_part(coalesce(c.primary_email,''),'@',2)) AS email_domain_raw,
          (regexp_split_to_array(lower(unaccent(coalesce(c.name,''))),'\\s+'))[array_length(regexp_split_to_array(lower(unaccent(coalesce(c.name,''))),'\\s+'),1)] AS last_name_norm_calc
  FROM contacts c WHERE c.id = b_id
), b2 AS (
  SELECT *,
    regexp_replace(
      CASE WHEN email_domain_raw IN ('gmail.com','googlemail.com') THEN replace(email_local_raw,'.','') ELSE email_local_raw END,
      '\\+.*$',''
    ) AS email_local_norm,
    email_domain_raw AS email_domain_norm
  FROM b
)
SELECT
  -- final weighted score assembled by caller; here we only compute primitives
  NULL::NUMERIC AS score,
  GREATEST(
    similarity(coalesce(a2.email_norm, a2.email_local_norm||'@'||a2.email_domain_norm),
               coalesce(b2.email_norm, b2.email_local_norm||'@'||b2.email_domain_norm)),
    similarity(a2.email_local_norm, b2.email_local_norm)
  ) AS email_sim,
  (CASE WHEN right(coalesce(a2.phone_e164, a2.primary_phone, ''),7) = right(coalesce(b2.phone_e164, b2.primary_phone, ''),7) AND right(coalesce(a2.phone_e164, a2.primary_phone, ''),7) <> '' THEN 1.0 ELSE 0.0 END) AS phone_equal,
  similarity(coalesce(a2.full_name_norm, a2.name_norm_fb), coalesce(b2.full_name_norm, b2.name_norm_fb)) AS name_sim,
  (CASE WHEN dmetaphone(coalesce(a2.last_name_norm, a2.last_name_norm_calc, '')) = dmetaphone(coalesce(b2.last_name_norm, b2.last_name_norm_calc, '')) THEN 1 ELSE 0 END) AS metaphone_match,
  similarity(coalesce(a2.company_norm, lower(unaccent(coalesce(a2.company,'')))), coalesce(b2.company_norm, lower(unaccent(coalesce(b2.company,''))))) AS company_sim,
  similarity(coalesce(a2.address_norm, lower(unaccent(coalesce(a2.address,'')))), coalesce(b2.address_norm, lower(unaccent(coalesce(b2.address,''))))) AS address_sim
FROM a2, b2;
$$;


