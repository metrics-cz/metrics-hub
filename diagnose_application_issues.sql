-- Diagnostic queries to identify application installation inconsistencies
-- Run these queries to understand the current state of application installations

-- 1. Check applications that exist in company_applications but may not appear in integrations page
SELECT 
    ca.id,
    ca.company_id,
    a.name as application_name,
    a.category_id,
    ac.name as category_name,
    ca.is_active,
    ca.installed_at
FROM company_applications ca
JOIN applications a ON ca.application_id = a.id
LEFT JOIN application_categories ac ON a.category_id = ac.id
WHERE ca.is_active = true
ORDER BY category_name, application_name;

-- 2. Find applications with category_id that doesn't match any existing category
SELECT 
    a.id,
    a.name,
    a.category_id,
    'No matching category found' as issue
FROM applications a
LEFT JOIN application_categories ac ON a.category_id = ac.id
WHERE ac.id IS NULL;

-- 3. Check if automation category exists and get its ID
SELECT id, name, description FROM application_categories WHERE name = 'automation';

-- 4. Find company applications that should appear in integrations but might be filtered out
SELECT 
    ca.id,
    ca.company_id,
    a.name as application_name,
    a.category_id,
    ac.name as category_name,
    CASE 
        WHEN ac.name = 'automation' THEN 'Should appear in Integrations'
        ELSE 'Should appear in Apps'
    END as expected_location
FROM company_applications ca
JOIN applications a ON ca.application_id = a.id
JOIN application_categories ac ON a.category_id = ac.id
WHERE ca.is_active = true
ORDER BY expected_location, application_name;

-- 5. Count installations by category
SELECT 
    ac.name as category_name,
    COUNT(ca.id) as installation_count
FROM company_applications ca
JOIN applications a ON ca.application_id = a.id
JOIN application_categories ac ON a.category_id = ac.id
WHERE ca.is_active = true
GROUP BY ac.name
ORDER BY installation_count DESC;

-- 6. Find applications with string category_id instead of UUID (this would be the bug)
SELECT 
    id,
    name,
    category_id,
    'Invalid category_id format' as issue
FROM applications 
WHERE category_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
AND category_id IS NOT NULL;