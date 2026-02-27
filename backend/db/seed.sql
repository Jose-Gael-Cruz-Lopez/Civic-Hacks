-- ============================================================
-- Sapling — Seed Data
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Run AFTER supabase_schema.sql
-- ============================================================

INSERT INTO users (id, name, email, streak_count) VALUES
  ('user_andres', 'Andres Lopez',  'andres@sapling.app',  0),
  ('user_jack',   'Jack He',       'jack@sapling.app',    0),
  ('user_luke',   'Luke Cooper',   'luke@sapling.app',    0),
  ('user_jose',   'Jose Gael',     'jose@sapling.app',    0)
ON CONFLICT (id) DO NOTHING;
