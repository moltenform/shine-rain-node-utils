# shine-rain-node-utils
NodeJS Utilities

- Schema wrappers
  - Adds the following features to better-sqlite-helper:
  - By default, `update` asserts that at one row was affected.
  - By default, `delete` asserts that at one row was affected.
  - Fields ending in `_json` are automatically converted.
  - Method names changed from `insert` to `insertWithoutValidation` to remind callers to prefer validated versions.
  - (The `insertValidated` versions are left for you to customize.)
- Database helpers
  - Add a schema version, and check for the version on each app load.
    - This both detects incorrect db versions and also detects corrupt/incomplete db files.
  - 
- Prevent race conditions
- Shine-rain-bg-tasks
  - A lightweight 


