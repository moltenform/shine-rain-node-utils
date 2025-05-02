import _ from 'lodash';
import { resetCwd } from '../../server-utils/node-server-utils.js';
import { fsUnlinkAsyncIfExists } from '../../server-utils/file-util-wrappers.js';
import { assertEq, assertThrow, assertTrue, genUuid } from '../../server-utils/jsutils.js';
import { runProtectedByLockAndTxn } from '../../server-utils/api-route-helpers.js';
import { createDocument, createEmployee } from '../../server-utils/db/schemaConstructors.js';
import { startTestDbMode } from '../../server-utils/db/schemaConnection.js';
import {
    deleteAllDocuments,
    deleteAllEmployees,
} from '../../server-utils/db/schemaDeconstructors.js';
import { getCountSkipOwnerCheck } from '../../server-utils/db/schemaWrappers.js';

/*
developed by Ben Fisher(moltenform.com)
*/

export async function testDb() {
    resetCwd();
    await runProtectedByLockAndTxn(
        async (conn) => {
            //~ return
    resetTestRows(conn);
    //~ runTestsWriteAccess(conn);
        },
        true /* writeAccess */,
        {} /* express res object */
    );

    await runProtectedByLockAndTxn(
        async (conn) => {
            runTestsReadOnly(conn);
        },
        false /* writeAccess */,
        {} /* express res object */
    );
}

function runTestsReadOnly(conn) {
    // read
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-1-doc.pdf,eeid2,undefined
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );

    // writing should be disallowed
    assertThrow(() => createDocument(conn, { ownerId: 'eeid1', name: `test-doc.pdf` }), 'xxx');
    assertThrow(() => conn.runSqlSkipOwnerCheck(`insert into EmployeeDocuments (name, id, ownerId) values ('test-doc.pdf', 'newid', 'eeid1')`), 'xxx');

    // updating should be disallowed
    assertThrow(
        () => conn.update('eed1', 'Employees', { firstName: 'changed' }, { ownerId: 'eed1' }),
        'xxx'
    );
    assertThrow(() => conn.runSqlSkipOwnerCheck(`update EmployeeDocuments set name='changed' where ownerId='eed1'`), 'xxx');

    // runSqlSkipOwnerCheck is ok if it's a query
    let got = conn.runSqlSkipOwnerCheck(`select * from EmployeeDocuments where ownerId='eed1'`);
    got = got.all()
    assertEq(3, got.length)

    // count rows
    got = getCountSkipOwnerCheck(conn, `select count(*) as whatToCount from EmployeeDocuments where ownerId='eed1'`);
    assertEq(3, got)
    got = getCountSkipOwnerCheck(conn, `select count(*) as whatToCount from EmployeeDocuments where ownerId='notexist'`);
    assertEq(0, got)
    got = getCountSkipOwnerCheck(conn, `select count(*) as whatToCount from EmployeeDocuments`);
    assertEq(6, got)
}

function resetTestRows(conn) {
    deleteAllDocuments(conn);
    deleteAllEmployees(conn);
    const ee1 = createEmployee(conn, { ownerId: 'eeid1', firstName: 'alice', lastName: 'smith' });
    const ee2 = createEmployee(conn, { ownerId: 'eeid2', firstName: 'bob', lastName: 'smith' });
    createDocument(conn, { ownerId: ee1.ownerId, name: `test-1-doc.pdf` });
    createDocument(conn, { ownerId: ee1.ownerId, name: `test-2-doc.pdf` });
    createDocument(conn, { ownerId: ee1.ownerId, name: `test-3-doc.pdf` });
    createDocument(conn, { ownerId: ee2.ownerId, name: `test-1-doc.pdf` });
    createDocument(conn, { ownerId: ee2.ownerId, name: `test-2-doc.pdf` });
    createDocument(conn, { ownerId: ee2.ownerId, name: `test-3-doc.pdf` });
}

function runTestsWriteAccess(conn) {
    resetTestRows(conn);

    // read
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-1-doc.pdf,eeid2,undefined
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );

    testDbQuery(conn);
    testDbUpdate(conn);
    testDbDelete(conn);
    testDbInsert(conn);
    testDbReplace(conn);

    // prep for runTestsReadOnly
    resetTestRows(conn);
}

function testDbReplace(conn) {
    resetTestRows(conn);
    const rowIdExists = conn.queryFirstRowChecked('eeid2', 'EmployeeDocuments', 'name=? order by name, ownerId', 'test-1-doc.pdf').id
    const rowIdNew = genUuid()

    // replaceSkipOwnerCheck, id exists
    resetTestRows(conn);
    conn.replaceSkipOwnerCheck(
        'EmployeeDocuments',
        { id: rowIdExists, name: 'new.pdf', ownerId: 'eeid2' },
    );
    checkEqual(
        conn,
        `zzz`
    );

    // replaceSkipOwnerCheck, id not exist
    resetTestRows(conn);
    conn.replaceSkipOwnerCheck(
        'EmployeeDocuments',
        { id: rowIdNew, name: 'new.pdf', ownerId: 'eeid2' },
    );
    checkEqual(
        conn,
        `zzz`
    );
}

function testDbInsert(conn) {
    // insertSkipOwnerCheck - schema mandatory value missing
    resetTestRows(conn);
    assertThrow(
        () => conn.insertSkipOwnerCheck('EmployeeDocuments', { name: 'new.pdf' }),
        'xxx'
    );

    // insertSkipOwnerCheck
    resetTestRows(conn);
    conn.insertSkipOwnerCheck('EmployeeDocuments', { name: 'new.pdf', ownerId: 'eeid2' });
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined
        new.pdf,eeid2,undefined`
    );

    // insertChecked
    resetTestRows(conn);
    conn.insertChecked('eeid2', 'EmployeeDocuments', { name: 'new.pdf' });
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined
        new.pdf,eeid2,undefined`
    );

    // insertChecked, first param has priority
    resetTestRows(conn);
    conn.insertChecked('eeid2', 'EmployeeDocuments', { name: 'new.pdf', ownerId: 'eeid1' });
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined
        new.pdf,eeid2,undefined`
    );

    // insertChecked, first param is missing
    resetTestRows(conn);
    assertThrow(
        () => conn.insertChecked(undefined, 'EmployeeDocuments', { name: 'new.pdf' }),
        'not a valid id'
    );
}

function testDbDelete(conn) {
    // deleteSkipOwnerCheck - ones that should be fine
    resetTestRows(conn);
    conn.deleteSkipOwnerCheck(
        'EmployeeDocuments',
        { name: 'notexist.pdf' },
        { noChangesOk: 1 }
    );
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-1-doc.pdf,eeid2,undefined
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );
    resetTestRows(conn);
    conn.deleteSkipOwnerCheck(
        'EmployeeDocuments',
        { name: 'test-1-doc.pdf' },
        { multiChangesOk: 1 }
    );
    checkEqual(
        conn,
        `test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );
    resetTestRows(conn);
    conn.deleteSkipOwnerCheck(
        'EmployeeDocuments',
        { ownerId: 'eeid2' },
        { name: 'test-1-doc.pdf' }
    );
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );

    // deleteSkipOwnerCheck - ones that should throw
    resetTestRows(conn);
    assertThrow(
        () => conn.deleteSkipOwnerCheck('EmployeeDocuments', { name: 'test-1-doc.pdf' }),
        'affected many rows'
    );
    resetTestRows(conn);
    assertThrow(
        () => conn.deleteSkipOwnerCheck('EmployeeDocuments', { name: 'notexist.pdf' }),
        'not affect any rows'
    );

    // deleteChecked - should be fine
    resetTestRows(conn);
    conn.deleteChecked('eeid2', 'EmployeeDocuments', { name: 'test-1-doc.pdf' });
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );

    // deleteChecked - should throw
    resetTestRows(conn);
    assertThrow(
        () => conn.deleteChecked('eeid2', 'EmployeeDocuments', { name: 'notexist.pdf' }),
        'not affect any rows'
    );
    resetTestRows(conn);
    assertThrow(
        () => conn.deleteChecked(undefined, 'EmployeeDocuments', { name: 'test-1-doc.pdf' }),
        'not a valid id'
    );
}

function testDbUpdate(conn) {
    // updateSkipOwnerCheck - ones that should be fine
    resetTestRows(conn);
    conn.updateSkipOwnerCheck(
        'EmployeeDocuments',
        { info: { x: 1 } },
        { name: 'notexist.pdf' },
        { noChangesOk: 1 }
    );
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-1-doc.pdf,eeid2,undefined
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );
    resetTestRows(conn);
    conn.updateSkipOwnerCheck(
        'EmployeeDocuments',
        { info: { x: 1 } },
        { name: 'test-1-doc.pdf' },
        { multiChangesOk: 1 }
    );
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,{ x: 1 }
        test-1-doc.pdf,eeid2,{ x: 1 }
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );
    resetTestRows(conn);
    conn.updateSkipOwnerCheck(
        'EmployeeDocuments',
        { info: { x: 1 }, ownerId: 'eeid2' },
        { name: 'test-1-doc.pdf' }
    );
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-1-doc.pdf,eeid2,{ x: 1 }
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );

    // updateSkipOwnerCheck - ones that should throw
    resetTestRows(conn);
    assertThrow(
        () =>
            conn.updateSkipOwnerCheck(
                'EmployeeDocuments',
                { info: { x: 1 } },
                { name: 'test-1-doc.pdf' }
            ),
        'affected many rows'
    );
    resetTestRows(conn);
    assertThrow(
        () =>
            conn.updateSkipOwnerCheck(
                'EmployeeDocuments',
                { info: { x: 1 } },
                { name: 'notexist.pdf' }
            ),
        'not affect any rows'
    );

    // updateChecked - should be fine
    resetTestRows(conn);
    conn.updateChecked(
        'eeid2',
        'EmployeeDocuments',
        { info: { x: 1 } },
        { name: 'test-1-doc.pdf' }
    );
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-1-doc.pdf,eeid2,{ x: 1 }
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );

    // updateChecked - should throw
    resetTestRows(conn);
    assertThrow(
        () =>
            conn.updateChecked(
                'eeid2',
                'EmployeeDocuments',
                { info: { x: 1 } },
                { name: 'notexist.pdf' }
            ),
        'not affect any rows'
    );
    resetTestRows(conn);
    assertThrow(
        () =>
            conn.updateChecked(
                undefined,
                'EmployeeDocuments',
                { info: { x: 1 } },
                { name: 'test-1-doc.pdf' }
            ),
        'not a valid id'
    );
}

function testDbQuery(conn) {
    // querySkipOwnerCheck
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-1-doc.pdf,eeid2,undefined`,
        conn.querySkipOwnerCheck(
            'select * from EmployeeDocuments where name=? order by name, ownerId',
            'test-1-doc.pdf'
        )
    );

    // querySkipOwnerCheck, no row
    assertEq(0, conn.querySkipOwnerCheck(
            'select * from EmployeeDocuments where name=? order by name, ownerId',
            'test-not-exist-doc.pdf'
        ).length
    );

    // queryChecked
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid2,undefined`,
        conn.queryChecked('eeid2', 'EmployeeDocuments', 'name=? order by name, ownerId', 'test-1-doc.pdf')
    );

    // queryChecked, no row
    assertEq(0, conn.queryChecked('eeid2', 'EmployeeDocuments', 'name=? order by name, ownerId', 'test-notexist-doc.pdf'
    ).length
    );

    // queryChecked, param is undefined
    assertThrow(
        () =>
            conn.queryChecked(
                undefined,
                'EmployeeDocuments',
                'name=? order by name, ownerId',
                'test-1-doc.pdf'
            ),
        'not a valid id'
    );

    // queryFirstRowSkipOwnerCheck
    checkEqual(conn, `test-1-doc.pdf,eeid1,undefined`, [
        conn.queryFirstRowSkipOwnerCheck(
            'select * from EmployeeDocuments where name=? order by name, ownerId',
            'test-1-doc.pdf'
        ),
    ]);

    // queryFirstRowSkipOwnerCheck, no row
    assertTrue(conn.queryFirstRowSkipOwnerCheck(
            'select * from EmployeeDocuments where name=? order by name, ownerId',
            'notexist.pdf'
        ) === undefined
    );

    // queryFirstRowChecked
    checkEqual(conn, `test-1-doc.pdf,eeid2,undefined`, [
        conn.queryFirstRowChecked('eeid2', 'EmployeeDocuments', 'name=? order by name, ownerId', 'test-1-doc.pdf'),
    ]);

    // queryFirstRowChecked, no row
    assertTrue(conn.queryFirstRowChecked('eeid2', 'EmployeeDocuments', 'name=? order by name, ownerId', 'notexist.pdf')
    === undefined);

    // queryFirstRowChecked, first param is missing
    assertThrow(() =>
        conn.queryFirstRowChecked(undefined, 'EmployeeDocuments', 'name=? order by name, ownerId', 'test-1-doc.pdf')
    );

    // queryFirstRowChecked, ends up getting conflicting ownerId=x and gets no results 
    assertTrue(conn.queryFirstRowChecked('eeid2', 'EmployeeDocuments', 'name=? and ownerId=? order by name, ownerId', [
            'test-1-doc.pdf',
            'eeid1',
        ]) === undefined);
}

function showRows(conn, rows = undefined) {
    rows = rows ?? conn.querySkipOwnerCheck(
        'select * from EmployeeDocuments order by name, ownerId'
    );
    return rows.map((row) => `${row.name},${row.ownerId},${row.info}`).join('\n');
}

function checkEqual(conn, a, rows = undefined) {
    const b = showRows(conn, rows);
    assertEq(a.replace(/ /g, '').replace(/\r\n/g, '\n').trim(), b.replace(/ /g, '').replace(/\r\n/g, '\n').trim());
}
