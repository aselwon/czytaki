CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_hash` text NOT NULL,
	`settings` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`book` text,
	`generated` integer DEFAULT 0 NOT NULL,
	`photo_key` text,
	`photo_type` text,
	`pdf_key` text,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'pln' NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`stripe_session` text,
	`email` text,
	`delivery_status` text DEFAULT 'pending' NOT NULL,
	`email_id` text,
	`email_attempt_at` integer,
	`lock_token` text,
	`lock_until` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_orders_owner_created` ON `orders` (`owner_hash`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_stripe_session` ON `orders` (`stripe_session`);--> statement-breakpoint
CREATE TABLE `generation_quotas` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
