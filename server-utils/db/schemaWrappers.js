import _ from 'lodash';
import { assertTrue } from '../../server-utils/jsutils.js';

// In our schema, there are ownerId fields for rows that are owned by a specific user.
// queryChecked makes it convenient to filter rows based on who should have access.
// querySkipOwnerCheck makes it inconvenient to bypass the check, since bypassing does not occur often.

export function makeMyPatches(dbConnection, transformJsonToStr, transformStrToJson) {
    if (!dbConnection._origQuery) {
        dbConnection._origQuery = dbConnection.query;
    }
    if (!dbConnection._origQueryFirstRow) {
        dbConnection._origQueryFirstRow = dbConnection.queryFirstRow;
    }
    if (!dbConnection._origUpdate) {
        dbConnection._origUpdate = dbConnection.update;
    }
    if (!dbConnection._origInsert) {
        dbConnection._origInsert = dbConnection.insert;
    }
    if (!dbConnection._origDelete) {
        dbConnection._origDelete = dbConnection.delete;
    }
    if (!dbConnection._origReplace) {
        dbConnection._origReplace = dbConnection.replace;
    }
    dbConnection.query = (...args) => {
        throw new Error('use queryChecked or querySkipOwnerCheck instead');
    };
    dbConnection.queryFirstRow = (...args) => {
        throw new Error('use queryCheckedFirstRow or queryFirstRowSkipOwnerCheck instead');
    };
    dbConnection.update = (...args) => {
        throw new Error('use updateChecked or updateSkipOwnerCheck instead');
    };
    dbConnection.insert = (...args) => {
        throw new Error('use insertChecked or insertSkipOwnerCheck instead');
    };
    dbConnection.delete = (...args) => {
        throw new Error('use deleteChecked or deleteSkipOwnerCheck instead');
    };
    dbConnection.replace = (...args) => {
        throw new Error('use replaceChecked or replaceSkipOwnerCheck instead');
    };
    dbConnection.querySkipOwnerCheck = (...args) => {
        if (args[0]) {
            assertTrue(typeof args[0] === 'string', `query must be a string`);
        }

        const ret = dbConnection._origQuery(...args).map(transformStrToJson);
        return ret;
    };
    dbConnection.queryChecked = (ownerId, table, conditions, ...args) => {
        assertTrue(ownerId, 'not a valid id');
        assertTrue(table.match(/^[a-zA-Z0-9_]+$/), 'table name must be alphanumeric');
        assertTrue(typeof conditions === 'string', 'conditions must be a string');
        for (let arg of args) {
            assertTrue(
                !(typeof arg === 'object' && !Array.isArray(arg)),
                'params passed in cannot be objects'
            );
        }

        conditions = ['(AllRecords)', '(AnyRecord)'].includes(conditions)
            ? 'true'
            : conditions;
        const q = `select * from ${table} where ownerId=? and ${conditions}`;

        return dbConnection.querySkipOwnerCheck(q, ownerId, ...args);
    };
    dbConnection.queryFirstRowSkipOwnerCheck = (...args) => {
        if (args[0]) {
            assertTrue(typeof args[0] === 'string', `query must be a string`);
        }

        const ret = dbConnection._origQueryFirstRow(...args);
        return transformStrToJson(ret);
    };
    dbConnection.queryFirstRowChecked = (ownerId, table, conditions, ...args) => {
        assertTrue(ownerId, 'not a valid id');
        assertTrue(table.match(/^[a-zA-Z0-9_]+$/), 'table name must be alphanumeric');
        assertTrue(typeof conditions === 'string', 'conditions must be a string');
        for (let arg of args) {
            assertTrue(
                !(typeof arg === 'object' && !Array.isArray(arg)),
                'params passed in cannot be objects'
            );
        }

        conditions = ['(AllRecords)', '(AnyRecord)'].includes(conditions)
            ? 'true'
            : conditions;
        const q = `select * from ${table} where ownerId=? and ${conditions}`;
        return dbConnection.queryFirstRowSkipOwnerCheck(q, ownerId, ...args);
    };
    // use { field: null } and not { field: undefined } to unset a value
    dbConnection.updateSkipOwnerCheck = (a1, a2, criteria, opts) => {
        a2 = transformJsonToStr(a2, 'update');
        const countChanges = dbConnection._origUpdate(a1, a2, criteria);
        if (countChanges === 0 && !opts?.noChangesOk) {
            // todo: distinguish between a) no rows found b) the rows found already had those vals
            throw new Error(
                'update did not affect any rows, use updateNoChangesOk if this is expected'
            );
        }
        if (countChanges > 1 && !opts?.multiChangesOk) {
            throw new Error(
                'update affected many rows, use multiChangesOk if this is expected'
            );
        }

        return countChanges;
    };
    // use { field: null } and not { field: undefined } to unset a value
    dbConnection.updateChecked = (ownerId, a1, a2, criteria, opts) => {
        assertTrue(ownerId, 'not a valid id');
        criteria = { ...criteria, ownerId: ownerId };
        return dbConnection.updateSkipOwnerCheck(a1, a2, criteria, opts);
    };
    dbConnection.deleteSkipOwnerCheck = (a1, a2, opts) => {
        const countChanges = dbConnection._origDelete(a1, a2);
        if (countChanges === 0 && !opts?.noChangesOk) {
            // todo: distinguish between a) no rows found b) the rows found already had those vals
            throw new Error(
                'delete did not affect any rows, use updateNoChangesOk if this is expected'
            );
        }
        if (countChanges > 1 && !opts?.multiChangesOk) {
            throw new Error(
                'delete affected many rows, use multiChangesOk if this is expected'
            );
        }

        return countChanges;
    };
    dbConnection.deleteChecked = (ownerId, a1, criteria, opts) => {
        assertTrue(ownerId, 'not a valid id');
        criteria = { ...criteria, ownerId: ownerId };
        return dbConnection.deleteSkipOwnerCheck(a1, criteria, opts);
    };
    dbConnection.insertSkipOwnerCheck = (a1, a2, ...args) => {
        a2 = transformJsonToStr(a2, 'insert');
        const countChanges = dbConnection._origInsert(a1, a2, ...args);
        assertTrue(countChanges >= 1, 'insert failed');
        return countChanges;
    };
    dbConnection.insertChecked = (ownerId, a1, a2, ...args) => {
        assertTrue(ownerId, 'not a valid id');
        a2 = { ...a2, ownerId: ownerId };
        return dbConnection.insertSkipOwnerCheck(a1, a2, ...args);
    };

    // be careful about replace() because it deletes the existing row and then inserts a new one,
    // for triggers or cascade delete it could create issues.
    dbConnection.runSqlPrepareSkipOwnerCheck = (q) => {
        return dbConnection.prepare(q);
    }
    dbConnection.runSqlSkipOwnerCheck = (q, ...params) => {
        const prepared = dbConnection.runSqlPrepareSkipOwnerCheck(q);
        const method = q.toLowerCase().startsWith('select') ? 'all' : 'run';
        if (q.includes('?')) {
            return prepared[method](...params);
        } else {
            return prepared[method]();
        }
    };
}

// Database methods are sync, not async.
// The author of the better-sqlite module explains the rationale in their repo.

export function getCountSkipOwnerCheck(conn, query, paramsToSend = undefined) {
    assertTrue(query.includes('whatToCount'));
    if (query.includes('?')) {
        assertTrue(paramsToSend !== undefined);
    }

    let c = conn.runSqlSkipOwnerCheck(query, paramsToSend);
    return c[0].whatToCount;
}

export function escapeForLike(s) {
    return s.replace(/%/g, '\\%').replace(/_/g, '\\_');
}
