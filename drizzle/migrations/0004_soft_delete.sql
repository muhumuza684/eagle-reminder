-- Tier 2 #6 — soft-delete + audit trail.

ALTER TABLE `commitments` ADD `deletedAt` timestamp;
ALTER TABLE `criticalCheckpoints` ADD `deletedAt` timestamp;

CREATE INDEX `commitments_userId_deletedAt_idx` ON `commitments` (`userId`, `deletedAt`);
