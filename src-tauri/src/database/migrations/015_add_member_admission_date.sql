ALTER TABLE members ADD COLUMN admission_date TEXT;

UPDATE members SET admission_date = substr(created_at, 1, 10) WHERE admission_date IS NULL;