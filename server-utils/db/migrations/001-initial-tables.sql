
-- Up
CREATE TABLE `Employees` (
  id PRIMARY KEY,
  firstName NOT NULL,
  lastName NOT NULL,
);

CREATE TABLE `EmployeeDocuments` (
  id PRIMARY KEY,
  ownerId NOT NULL,
  documentContent,
  documentType,
  counter,
  info_json -- demonstrate our json helpers
)

CREATE TABLE IF NOT EXISTS `Metadata` (
  metadataId PRIMARY KEY NOT NULL,
  schemaVersion
);

-- Down
DROP TABLE IF EXISTS `Employees`;
DROP TABLE IF EXISTS `EmployeeTeams`;
DROP TABLE IF EXISTS `Metadata`;
