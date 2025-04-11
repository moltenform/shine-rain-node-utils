import _ from 'lodash';
import { resetCwd } from '../../server-utils/node-server-utils.js';
import { fsUnlinkAsyncIfExists } from '../../server-utils/file-util-wrappers.js';
import { assertEq } from '../../server-utils/jsutils.js';
import { runProtectedByLockAndTxn } from '../../server-utils/api-route-helpers.js';

/*
developed by Ben Fisher(moltenform.com)
*/

export async function dbTests() {
    resetCwd();
    await fsUnlinkAsyncIfExists('./api/test/testdb.db');
    await fsUnlinkAsyncIfExists('./api/test/testdb.db-shm');
    await fsUnlinkAsyncIfExists('./api/test/testdb.db-wal');

    await runProtectedByLockAndTxn(async (conn) => {
        conn.insertWithoutValidationAnyOrganization('Employees', {id: 'testEmployee', firstName: 'bob', lastName: 'smith', counter: 1,})
        const result = conn.queryAnyOrganizationFirstRow('select * from Employees where id = ?', 'testEmployee')
        assertEq('bob', result.firstName)
        assertEq('smith', result.lastName)
        assertEq(1, result.counter)
    }, true /* writeAccess */, {} /* express res object */)
}

