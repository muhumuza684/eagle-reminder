-- Tier 3 #12 — production push delivery.

CREATE TABLE `pushTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`platform` enum('ios','android','web') NOT NULL,
	`lastBriefingSentAt` timestamp,
	`lastReviewSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pushTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `pushTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint

CREATE INDEX `pushTokens_userId_idx` ON `pushTokens` (`userId`);
