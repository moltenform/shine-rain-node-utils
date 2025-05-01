
-- Up
CREATE TABLE `Employees` (
  id PRIMARY KEY,
  firstName NOT NULL,
  lastName NOT NULL
);

CREATE TABLE `EmployeeDocuments` (
  id PRIMARY KEY,
  ownerId NOT NULL, -- demonstrate our owner checks
  documentContent,
  documentType,
  name,
  info_json -- demonstrate our json features
);

CREATE TABLE IF NOT EXISTS `Metadata` (
  metadataId PRIMARY KEY NOT NULL,
  schemaVersion
);

-- Down
DROP TABLE IF EXISTS `Employees`;
DROP TABLE IF EXISTS `EmployeeDocuments`;
DROP TABLE IF EXISTS `Metadata`;

