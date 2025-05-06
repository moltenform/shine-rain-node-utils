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

/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */

export async function testDb() {
    await runProtectedByLockAndTxn(
        async (conn) => {
            runTestsWriteAccess(conn);
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
    assertThrow(
        () => createDocument(conn, { ownerId: 'eeid1', name: `test-doc.pdf` }),
        'not a function'
    );
    assertThrow(
        () =>
            conn.runSqlSkipOwnerCheck(
                `insert into EmployeeDocuments (name, id, ownerId) values ('test-doc.pdf', 'newid', 'eeid1')`
            ),
        'must be a select'
    );

    // updating should be disallowed
    assertThrow(
        () => conn.update('eed1', 'Employees', { firstName: 'changed' }, { ownerId: 'eed1' }),
        'disabled'
    );
    assertThrow(
        () =>
            conn.runSqlSkipOwnerCheck(
                `update EmployeeDocuments set name='changed' where ownerId='eed1'`
            ),
        'must be a select'
    );

    // runSqlSkipOwnerCheck is ok if it's a query
    let got = conn.runSqlSkipOwnerCheck(
        `select * from EmployeeDocuments where ownerId='eeid1'`
    );
    assertEq(3, got.length);

    // count rows
    got = getCountSkipOwnerCheck(
        conn,
        `select count(*) as whatToCount from EmployeeDocuments where ownerId='eeid1'`
    );
    assertEq(3, got);
    got = getCountSkipOwnerCheck(
        conn,
        `select count(*) as whatToCount from EmployeeDocuments where ownerId='notexist'`
    );
    assertEq(0, got);
    got = getCountSkipOwnerCheck(
        conn,
        `select count(*) as whatToCount from EmployeeDocuments`
    );
    assertEq(6, got);
}

function resetTestRows(conn) {
    deleteAllDocuments(conn);
    deleteAllEmployees(conn);
    assertEq(
        0,
        getCountSkipOwnerCheck(conn, `select count(*) as whatToCount from EmployeeDocuments`)
    );
    assertEq(0, getCountSkipOwnerCheck(conn, `select count(*) as whatToCount from Employees`));
    const ee1 = createEmployee(conn, {
        ownerId: 'eeid1',
        firstName: 'alice',
        lastName: 'smith',
    });
    const ee2 = createEmployee(conn, {
        ownerId: 'eeid2',
        firstName: 'bob',
        lastName: 'smith',
    });
    createDocument(conn, { ownerId: ee1.ownerId, name: `test-1-doc.pdf` });
    createDocument(conn, { ownerId: ee1.ownerId, name: `test-2-doc.pdf` });
    createDocument(conn, { ownerId: ee1.ownerId, name: `test-3-doc.pdf` });
    createDocument(conn, { ownerId: ee2.ownerId, name: `test-1-doc.pdf` });
    createDocument(conn, { ownerId: ee2.ownerId, name: `test-2-doc.pdf` });
    createDocument(conn, { ownerId: ee2.ownerId, name: `test-3-doc.pdf` });
}

function runTestsWriteAccess(conn) {
    resetTestRows(conn);
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
    testDbJson(conn);

    // prep for runTestsReadOnly
    resetTestRows(conn);
}

function testDbInsert(conn) {
    // insertSkipOwnerCheck - schema mandatory value missing
    resetTestRows(conn);
    assertThrow(
        () => conn.insertSkipOwnerCheck('EmployeeDocuments', { name: 'new.pdf' }),
        'constraint failed'
    );

    // insertSkipOwnerCheck
    resetTestRows(conn);
    conn.insertSkipOwnerCheck('EmployeeDocuments', { name: 'new.pdf', ownerId: 'eeid2' });
    checkEqual(
        conn,
        `new.pdf,eeid2,undefined
        test-1-doc.pdf,eeid1,undefined
        test-1-doc.pdf,eeid2,undefined
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );

    // insertChecked
    resetTestRows(conn);
    conn.insertChecked('eeid2', 'EmployeeDocuments', { name: 'new.pdf' });
    checkEqual(
        conn,
        `new.pdf,eeid2,undefined
        test-1-doc.pdf,eeid1,undefined
        test-1-doc.pdf,eeid2,undefined
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );

    // insertChecked, first param has priority
    resetTestRows(conn);
    conn.insertChecked('eeid2', 'EmployeeDocuments', { name: 'new.pdf', ownerId: 'eeid1' });
    checkEqual(
        conn,
        `new.pdf,eeid2,undefined
        test-1-doc.pdf,eeid1,undefined
        test-1-doc.pdf,eeid2,undefined
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
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
    conn.deleteSkipOwnerCheck('EmployeeDocuments', {
        name: 'test-1-doc.pdf',
        ownerId: 'eeid2',
    });
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
        `test-1-doc.pdf,eeid1,{x:1}
        test-1-doc.pdf,eeid2,{x:1}
        test-2-doc.pdf,eeid1,undefined
        test-2-doc.pdf,eeid2,undefined
        test-3-doc.pdf,eeid1,undefined
        test-3-doc.pdf,eeid2,undefined`
    );
    resetTestRows(conn);
    conn.updateSkipOwnerCheck(
        'EmployeeDocuments',
        { info: { x: 1 } },
        { name: 'test-1-doc.pdf', ownerId: 'eeid2' }
    );
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid1,undefined
        test-1-doc.pdf,eeid2,{x:1}
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
        test-1-doc.pdf,eeid2,{x:1}
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
    assertEq(
        0,
        conn.querySkipOwnerCheck(
            'select * from EmployeeDocuments where name=? order by name, ownerId',
            'test-not-exist-doc.pdf'
        ).length
    );

    // queryChecked
    checkEqual(
        conn,
        `test-1-doc.pdf,eeid2,undefined`,
        conn.queryChecked(
            'eeid2',
            'EmployeeDocuments',
            'name=? order by name, ownerId',
            'test-1-doc.pdf'
        )
    );

    // queryChecked, no row
    assertEq(
        0,
        conn.queryChecked(
            'eeid2',
            'EmployeeDocuments',
            'name=? order by name, ownerId',
            'test-notexist-doc.pdf'
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
    assertTrue(
        conn.queryFirstRowSkipOwnerCheck(
            'select * from EmployeeDocuments where name=? order by name, ownerId',
            'notexist.pdf'
        ) === undefined
    );

    // queryFirstRowChecked
    checkEqual(conn, `test-1-doc.pdf,eeid2,undefined`, [
        conn.queryFirstRowChecked(
            'eeid2',
            'EmployeeDocuments',
            'name=? order by name, ownerId',
            'test-1-doc.pdf'
        ),
    ]);

    // queryFirstRowChecked, no row
    assertTrue(
        conn.queryFirstRowChecked(
            'eeid2',
            'EmployeeDocuments',
            'name=? order by name, ownerId',
            'notexist.pdf'
        ) === undefined
    );

    // queryFirstRowChecked, first param is missing
    assertThrow(() =>
        conn.queryFirstRowChecked(
            undefined,
            'EmployeeDocuments',
            'name=? order by name, ownerId',
            'test-1-doc.pdf'
        )
    );

    // queryFirstRowChecked, ends up getting conflicting ownerId=x and gets no results
    assertTrue(
        conn.queryFirstRowChecked(
            'eeid2',
            'EmployeeDocuments',
            'name=? and ownerId=? order by name, ownerId',
            ['test-1-doc.pdf', 'eeid1']
        ) === undefined
    );
}

function testDbJson(conn) {
    resetTestRows(conn);

    // test update null semantics on a non-json field.
    // first give a value.
    conn.updateSkipOwnerCheck(
        'eeid1',
        'CompanyDocuments',
        { documentType: 'abc', documentContent: genUuid() },
        { name: 'test-1-doc.pdf', companyId: 'eeid1' }
    );
    assertEq(
        'abc',
        conn.queryFirstRowChecked('eeid1', `CompanyDocuments`, `name = 'test-1-doc.pdf'`)
            .documentType
    );

    // set the value to undefined. our warning fires
    assertThrow(
        () =>
            conn.updateSkipOwnerCheck(
                'eeid1',
                'CompanyDocuments',
                { documentType: undefined, documentContent: genUuid() },
                { name: 'test-1-doc.pdf', companyId: 'eeid1' }
            ),
        'undefined in column'
    );

    // set the value to null. better-sqlite sets to NULL in the db
    conn.updateSkipOwnerCheck(
        'eeid1',
        'CompanyDocuments',
        { documentType: null, documentContent: genUuid() }, // not ignored
        { name: 'test-1-doc.pdf', companyId: 'eeid1' }
    );
    assertEq(
        null,
        conn.queryFirstRowChecked('eeid1', `CompanyDocuments`, `name = 'test-1-doc.pdf'`)
            .documentType
    );

    // quoted empty string in the db -> empty string in js
    conn.runSqlSkipOwnerCheck(
        `update CompanyDocuments set companyInfo_json = '""' where name = 'test-1-doc.pdf'`
    );
    assertEq(
        '',
        conn.queryFirstRowChecked('eeid1', `CompanyDocuments`, `name = 'test-1-doc.pdf'`)
            .companyInfo
    );

    // empty string in the db -> error in js
    conn.runSqlSkipOwnerCheck(
        `update CompanyDocuments set companyInfo_json = '' where name = 'test-1-doc.pdf'`
    );
    assertThrow(
        () =>
            conn.queryFirstRowChecked('eeid1', `CompanyDocuments`, `name = 'test-1-doc.pdf'`)
                .companyInfo
    );

    // NULL in the db -> undefined in js
    conn.runSqlSkipOwnerCheck(
        `update CompanyDocuments set companyInfo_json = NULL where name = 'test-1-doc.pdf'`
    );
    assertEq(
        undefined,
        conn.queryFirstRowChecked('eeid1', `CompanyDocuments`, `name = 'test-1-doc.pdf'`)
            .companyInfo
    );

    // {} in js -> {} in the db
    conn.updateSkipOwnerCheck(
        'eeid1',
        'CompanyDocuments',
        { companyInfo: {} },
        { name: 'test-1-doc.pdf', companyId: 'eeid1' }
    );
    assertEq(
        [{ 1: 1 }],
        conn.runSqlSkipOwnerCheck(
            `select 1 from CompanyDocuments where name = 'test-1-doc.pdf' and companyId = 'eeid1' and companyInfo_json = '{}'`
        )
    );

    // undefined in js -> our warning fires
    conn.updateSkipOwnerCheck(
        'eeid1',
        'CompanyDocuments',
        { companyInfo: {}, documentContent: genUuid() }, // first set it to something non-null
        { name: 'test-1-doc.pdf', companyId: 'eeid1' }
    );
    assertThrow(
        () =>
            conn.updateSkipOwnerCheck(
                'eeid1',
                'CompanyDocuments',
                { companyInfo: undefined, documentContent: genUuid() },
                { name: 'test-1-doc.pdf', companyId: 'eeid1' }
            ),
        'undefined in column'
    );

    // null in js -> NULL in the db (in sql, you have to write IS NULL not = NULL)
    conn.updateSkipOwnerCheck(
        'eeid1',
        'CompanyDocuments',
        { companyInfo: {}, documentContent: genUuid() }, // first set it to something non-null
        { name: 'test-1-doc.pdf', companyId: 'eeid1' }
    );
    conn.updateSkipOwnerCheck(
        'eeid1',
        'CompanyDocuments',
        { companyInfo: null, documentContent: genUuid() },
        { name: 'test-1-doc.pdf', companyId: 'eeid1' }
    );
    assertEq(
        [{ 1: 1 }],
        conn.runSqlSkipOwnerCheck(
            `select 1 from CompanyDocuments where name = 'test-1-doc.pdf' and companyId = 'eeid1' and companyInfo_json is NULL`
        )
    );

    // empty string in js -> our warning should fire
    assertThrow(
        () =>
            conn.updateSkipOwnerCheck(
                'eeid1',
                'CompanyDocuments',
                { companyInfo: '', documentContent: genUuid() },
                { name: 'test-1-doc.pdf' }
            ),
        'non-object'
    );

    // string literal in js -> our warning should fire
    assertThrow(
        () =>
            conn.updateSkipOwnerCheck(
                'eeid1',
                'CompanyDocuments',
                { companyInfo: 'abc', documentContent: genUuid() },
                { name: 'test-1-doc.pdf' }
            ),
        'non-object'
    );

    // numeric literal in js -> our warning should fire
    assertThrow(
        () =>
            conn.updateSkipOwnerCheck(
                'eeid1',
                'CompanyDocuments',
                { companyInfo: 123, documentContent: genUuid() },
                { name: 'test-1-doc.pdf' }
            ),
        'non-object'
    );

    // array in js -> should work
    conn.updateSkipOwnerCheck(
        'eeid1',
        'CompanyDocuments',
        { companyInfo: [1, 2, 3] },
        { name: 'test-1-doc.pdf', companyId: 'eeid1' }
    );
    assertEq(
        [1, 2, 3],
        conn.queryFirstRowChecked('eeid1', `CompanyDocuments`, `name = 'test-1-doc.pdf'`)
            .companyInfo
    );

    // object w nesting in js -> should work
    conn.updateSkipOwnerCheck(
        'eeid1',
        'CompanyDocuments',
        { companyInfo: { a: { b: { c: 1 } } } },
        { name: 'test-1-doc.pdf', companyId: 'eeid1' }
    );
    assertEq(
        { a: { b: { c: 1 } } },
        conn.queryFirstRowChecked('eeid1', `CompanyDocuments`, `name = 'test-1-doc.pdf'`)
            .companyInfo
    );
}

function showRows(conn, rows = undefined) {
    rows =
        rows ??
        conn.querySkipOwnerCheck('select * from EmployeeDocuments order by name, ownerId');
    const renderInfo = (info) => (info ? JSON.stringify(info).replace(/"/g, '') : info);
    return rows.map((row) => `${row.name},${row.ownerId},${renderInfo(row.info)}`).join('\n');
}

function checkEqual(conn, a, rows = undefined) {
    const b = showRows(conn, rows);
    assertEq(
        a.replace(/ /g, '').replace(/\r\n/g, '\n').trim(),
        b.replace(/ /g, '').replace(/\r\n/g, '\n').trim()
    );
}
