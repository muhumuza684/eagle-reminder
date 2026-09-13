ALTER TABLE `commitments` ADD COLUMN `clientId` varchar(36) NULL;
ALTER TABLE `commitments` ADD COLUMN `revision` int NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX `commitments_clientId_unique` ON `commitments` (`clientId`);
