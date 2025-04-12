# shine-rain-node-utils
NodeJS Utilities

- Schema wrappers
  - Adds the following features to better-sqlite-helper:
  - By default, `update` asserts that at one row was affected.
  - By default, `delete` asserts that at one row was affected.
  - Fields ending in `_json` are automatically converted.
  - Add database methods with ownership checks.
    - Often CRUD actions should be allowed or blocked based on the logged-in user.
  - Add database methods like `insertChecked` that conveniently scope the operation to one team.
    - Foe example, its 
- Database helpers
  - Add a schema version, and check for the version on each app load.
    - This both detects incorrect db versions and also detects corrupt/incomplete db files.
  - 
- Prevent race conditions
- Shine-rain-bg-tasks
  - A lightweight 


