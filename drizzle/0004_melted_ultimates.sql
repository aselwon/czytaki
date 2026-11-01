CREATE TABLE `ai_budget_alerts` (
	`day` text NOT NULL,
	`threshold` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ai_budget_alert_day` ON `ai_budget_alerts` (`day`,`threshold`);--> statement-breakpoint
CREATE TABLE `ai_daily_budget` (
	`day` text PRIMARY KEY NOT NULL,
	`reserved_grosze` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `ai_calls` ADD `budget_day` text;--> statement-breakpoint
ALTER TABLE `ai_calls` ADD `reserved_grosze` integer;--> statement-breakpoint
ALTER TABLE `ai_calls` ADD `usd_pln_rate` text;--> statement-breakpoint
ALTER TABLE `ai_calls` ADD `cost_grosze` integer;