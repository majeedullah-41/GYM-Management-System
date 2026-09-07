ALTER TABLE members ADD COLUMN blood_group TEXT
    CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));

CREATE INDEX IF NOT EXISTS idx_members_blood_group ON members(blood_group);
