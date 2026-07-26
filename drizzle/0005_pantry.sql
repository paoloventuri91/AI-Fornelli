CREATE TABLE `pantry_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_normalized` text NOT NULL,
	`quantity` real,
	`unit` text NOT NULL,
	`expires_on` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
