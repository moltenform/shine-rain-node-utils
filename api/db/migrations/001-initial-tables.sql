
-- Up
CREATE TABLE `employees` (
  id PRIMARY KEY,
  first_name NOT NULL,
  last_name NOT NULL,
  email,
  counter,
  info_json -- demonstrate our json helpers
);

CREATE TABLE IF NOT EXISTS `Metadata` (
  metadataId PRIMARY KEY NOT NULL,
  schemaVersion
);

-- Down
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `metadata`;
