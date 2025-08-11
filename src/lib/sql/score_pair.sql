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
         (regexp_split_to_array(lower(unaccent(coalesce(c.name,''))),'\\s+'))[array_length(regexp_split_to_array(lower(unaccent(coalesce(c.name,''))),'\\s+'),1)] AS last_name_norm
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
         (regexp_split_to_array(lower(unaccent(coalesce(c.name,''))),'\\s+'))[array_length(regexp_split_to_array(lower(unaccent(coalesce(c.name,''))),'\\s+'),1)] AS last_name_norm
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
    similarity(coalesce((SELECT email_norm FROM a2), (SELECT email_local_norm||'@'||email_domain_norm FROM a2)),
              coalesce((SELECT email_norm FROM b2), (SELECT email_local_norm||'@'||email_domain_norm FROM b2))),
    similarity((SELECT email_local_norm FROM a2), (SELECT email_local_norm FROM b2))
  ) AS email_sim,
  (CASE WHEN right(coalesce((SELECT phone_e164 FROM a2), (SELECT primary_phone FROM a2)),7) = right(coalesce((SELECT phone_e164 FROM b2),(SELECT primary_phone FROM b2)),7) AND right(coalesce((SELECT phone_e164 FROM a2), (SELECT primary_phone FROM a2)),7) <> '' THEN 1.0 ELSE 0.0 END) AS phone_equal,
  similarity(coalesce((SELECT full_name_norm FROM a2),(SELECT name_norm_fb FROM a2)), coalesce((SELECT full_name_norm FROM b2),(SELECT name_norm_fb FROM b2))) AS name_sim,
  (CASE WHEN dmetaphone(coalesce((SELECT last_name_norm FROM a2),'')) = dmetaphone(coalesce((SELECT last_name_norm FROM b2),'')) THEN 1 ELSE 0 END) AS metaphone_match,
  similarity(coalesce((SELECT company_norm FROM a2), lower(unaccent(coalesce((SELECT company FROM a2),''))) ), coalesce((SELECT company_norm FROM b2), lower(unaccent(coalesce((SELECT company FROM b2),''))))) AS company_sim,
  similarity(coalesce((SELECT address_norm FROM a2), lower(unaccent(coalesce((SELECT address FROM a2),''))) ), coalesce((SELECT address_norm FROM b2), lower(unaccent(coalesce((SELECT address FROM b2),''))))) AS address_sim;
$$;


