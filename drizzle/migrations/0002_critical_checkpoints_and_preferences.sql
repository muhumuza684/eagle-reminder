-- MERGED — regenerate with `drizzle-kit generate` against the merged
-- schema.ts if your drizzle-kit version expects its own naming/hash;
-- the statements below are what that generation should produce.

ALTER TABLE `commitments` ADD `criticalDeadline` timestamp;
ALTER TABLE `commitments` ADD `warningMuted` boolean;
--> statement-breakpoint

CREATE TABLE `criticalCheckpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`commitmentId` int NOT NULL,
	`stage` enum('day_before','three_hours') NOT NULL,
	`dueAt` timestamp NOT NULL,
	`status` enum('pending','acknowledged','escalated','missed') NOT NULL DEFAULT 'pending',
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `criticalCheckpoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE TABLE `userPreferences` (
	`userId` int NOT NULL,
	`briefingHour` int NOT NULL DEFAULT 8,
	`reviewHour` int NOT NULL DEFAULT 22,
	`notificationsEnabled` boolean NOT NULL DEFAULT true,
	`voiceEnabled` boolean NOT NULL DEFAULT true,
	`meetingChimeMuted` boolean NOT NULL DEFAULT false,
	`earlyWarningMuted` boolean NOT NULL DEFAULT false,
	`shareTheme` varchar(32) NOT NULL DEFAULT 'Signal',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPreferences_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint

CREATE INDEX `criticalCheckpoints_commitmentId_idx` ON `criticalCheckpoints` (`commitmentId`);
CREATE INDEX `criticalCheckpoints_userId_idx` ON `criticalCheckpoints` (`userId`);
