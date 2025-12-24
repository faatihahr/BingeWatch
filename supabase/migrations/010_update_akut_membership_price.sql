-- Update Akut membership price to 50000 IDR
UPDATE membership_types 
SET price = 50000.00, updated_at = NOW()
WHERE name = 'Akut';
