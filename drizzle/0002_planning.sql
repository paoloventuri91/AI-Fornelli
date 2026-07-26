CREATE TABLE `dish_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dish_id` integer NOT NULL,
	`name` text NOT NULL,
	`quantity` real,
	`unit` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dishes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`title_normalized` text NOT NULL,
	`servings_base` integer DEFAULT 2 NOT NULL,
	`steps_json` text DEFAULT '[]' NOT NULL,
	`language` text DEFAULT 'it' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_plan_id` integer NOT NULL,
	`date` text NOT NULL,
	`slot_name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`planned_dish_id` integer,
	`actual_dish_id` integer,
	`is_eating_out` integer DEFAULT false NOT NULL,
	`absent_profiles_json` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`week_plan_id`) REFERENCES `week_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`planned_dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`actual_dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `week_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`constraints_text` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `week_plans_week_start_unique` ON `week_plans` (`week_start`);