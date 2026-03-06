-- Migration: 002_seed_default_user
-- Description: Insert default admin account (sealv) if it does not already exist.

INSERT IGNORE INTO users (id, username, email, password, role, is_verified, ava)
VALUES (
  'sealv00',
  'sealv',
  'huynguyen2182004@gmail.com',
  '$2b$10$LJTZ8YP8cF3AluKljhmJm.M0oEs7VhXh5M2m/KxvoNKS2J3.rF0My',
  'Admin',
  TRUE,
  1
);
