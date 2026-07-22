CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`language` text DEFAULT 'it' NOT NULL,
	`ai_model` text DEFAULT 'google/gemini-2.5-flash' NOT NULL,
	`setup_completed` integer DEFAULT false NOT NULL,
	`week_start_day` integer DEFAULT 1 NOT NULL
);
