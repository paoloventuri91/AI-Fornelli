CREATE TABLE `shopping_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`name` text NOT NULL,
	`name_normalized` text NOT NULL,
	`quantity` real,
	`unit` text NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`source` text DEFAULT 'auto' NOT NULL
);
