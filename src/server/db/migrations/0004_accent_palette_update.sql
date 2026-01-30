-- Update legacy accent values to the new allowed palette
UPDATE "user"
SET "accent_color" = CASE
  WHEN "accent_color" = 'purple' THEN 'purple'
  WHEN "accent_color" = 'indigo' THEN 'purple'
  WHEN "accent_color" = 'blue' THEN 'sky'
  WHEN "accent_color" IN ('cyan', 'teal', 'green') THEN 'mint'
  WHEN "accent_color" IN ('pink', 'caramel', 'mint', 'sky', 'strawberry') THEN "accent_color"
  ELSE 'purple'
END;

-- Change default for new users
ALTER TABLE "user" ALTER COLUMN "accent_color" SET DEFAULT 'purple';
