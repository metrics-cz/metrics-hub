-- Update application icons with proper URLs
-- Using public CDN icons for now, can be replaced with uploaded icons later

UPDATE applications SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/slack.svg' WHERE name = 'Slack';
UPDATE applications SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlesheets.svg' WHERE name = 'Google Sheets';  
UPDATE applications SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/trello.svg' WHERE name = 'Trello';
UPDATE applications SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/hubspot.svg' WHERE name = 'HubSpot CRM';
UPDATE applications SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gmail.svg' WHERE name = 'Gmail';
UPDATE applications SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/powerbi.svg' WHERE name = 'Power BI';