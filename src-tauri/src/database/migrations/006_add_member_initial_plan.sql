-- Add optional initial membership plan per member
-- Migration: 006_add_member_initial_plan

ALTER TABLE members ADD COLUMN membership_plan_id TEXT REFERENCES membership_plans(id);
