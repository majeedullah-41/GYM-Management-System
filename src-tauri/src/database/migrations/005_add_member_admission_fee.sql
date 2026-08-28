-- Add optional admission fee per member
-- Migration: 005_add_member_admission_fee

ALTER TABLE members ADD COLUMN admission_fee INTEGER;
