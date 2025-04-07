-- Up
CREATE TABLE `users` (
  id VARCHAR PRIMARY KEY,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email,
  counter,
  -- demonstrates our json feature
  info_json
);

-- Down
DROP TABLE IF EXISTS `users`;
