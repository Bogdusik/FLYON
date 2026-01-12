-- Fix device_token length issue
-- JWT tokens can be longer than 255 characters

ALTER TABLE drones ALTER COLUMN device_token TYPE TEXT;
