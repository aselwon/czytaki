CREATE TABLE `ai_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`kind` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`images` integer DEFAULT 0 NOT NULL,
	`size` text,
	`quality` text,
	`cost_cents` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ai_calls_order` ON `ai_calls` (`order_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `orders` ADD `ai_cost_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_verified_at` integer;