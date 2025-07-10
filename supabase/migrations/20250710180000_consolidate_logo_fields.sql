-- Consolidate square_logo_url into logo_url and remove redundant field
-- This migration consolidates the square logo functionality into the main logo_url field

-- First, copy square_logo_url values to logo_url where logo_url is null or empty
UPDATE companies 
SET logo_url = square_logo_url 
WHERE (logo_url IS NULL OR logo_url = '') 
  AND square_logo_url IS NOT NULL 
  AND square_logo_url != '';

-- For companies that have both logo_url and square_logo_url, prefer square_logo_url
-- since it's the newer field and more likely to be correct
UPDATE companies 
SET logo_url = square_logo_url 
WHERE square_logo_url IS NOT NULL 
  AND square_logo_url != ''
  AND square_logo_url != logo_url;

-- Now drop the redundant square_logo_url column
ALTER TABLE companies DROP COLUMN square_logo_url;

-- Add comment to clarify the logo_url purpose
COMMENT ON COLUMN companies.logo_url IS 'Main company logo (square format, used in avatars and general display)';
COMMENT ON COLUMN companies.rectangular_logo_url IS 'Rectangular company logo for specific use cases (headers, letterheads, etc.)';