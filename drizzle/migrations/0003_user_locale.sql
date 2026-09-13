-- Tier 2 #5 — regenerate with `drizzle-kit generate` against schema.ts if
-- your drizzle-kit version expects its own naming/hash; this is what that
-- generation should produce. Kept as its own migration (0003) rather than
-- editing 0002, since 0002 documents a state that may already be applied.

ALTER TABLE `users` ADD `timezone` varchar(64) NOT NULL DEFAULT 'UTC';
ALTER TABLE `users` ADD `language` varchar(8) NOT NULL DEFAULT 'en';
