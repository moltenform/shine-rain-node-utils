import _ from 'lodash';
import { resetCwd } from '../../server-utils/node-server-utils.js';
import { fsUnlinkAsyncIfExists } from '../../server-utils/file-util-wrappers.js';

/*
developed by Ben Fisher(moltenform.com)
*/

export async function dbTests() {
    resetCwd();
    await fsUnlinkAsyncIfExists('./api/test/testdb.db');
    await fsUnlinkAsyncIfExists('./api/test/testdb.db-shm');
    await fsUnlinkAsyncIfExists('./api/test/testdb.db-wal');
    await fsUnlinkAsyncIfExists('./api/test/testdb.db.addedSchema');
}
