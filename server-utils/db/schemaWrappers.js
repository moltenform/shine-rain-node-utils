

import _ from 'lodash';
import { assertTrue } from "../../server-utils/jsutils.js";

// Employees can by default view the information of other employees in the same
// team, but not other teams.

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
        throw new Error('use queryCheckedFirstRow or querySkipOwnerCheckFirstRow instead');
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
            assertTrue(typeof args[0] === 'string', `query must be a string`)
        }

        const ret = dbConnection._origQuery(...args).map(transformStrToJson);
        return ret;
    };
    dbConnection.queryChecked = (ownerId, table, conditions, ...args) => {
        serverUtils.assertTrue(table.match(/^[a-zA-Z0-9_]+$/), 'table name must be alphanumeric');
        serverUtils.assertTrue(typeof conditions === 'string', 'conditions must be a string');
        for (let arg of args) {
            serverUtils.assertTrue(!(typeof arg === 'object' && !Array.isArray(arg)), 'params passed in cannot be objects');
        }
        
        conditions = conditions === '(AllRecords)' ? 'true' : conditions;
        const q = `select * from ${table} where employeeTeamId=? and ${conditions}`;
        
        return dbConnection.querySkipOwnerCheck(q, ownerId, ...args);
    };
    dbConnection.querySkipOwnerCheckFirstRow = (...args) => {
        if (args[0]) {
            assertTrue(typeof args[0] === 'string', `query must be a string`)
        }

        const ret = dbConnection._origQueryFirstRow(...args);
        return transformStrToJson(ret);
    };
    dbConnection.queryCheckedFirstRow = (ownerId, table, conditions, ...args) => {
        serverUtils.assertTrue(table.match(/^[a-zA-Z0-9_]+$/), 'table name must be alphanumeric');
        serverUtils.assertTrue(typeof conditions === 'string', 'conditions must be a string');
        for (let arg of args) {
            serverUtils.assertTrue(!(typeof arg === 'object' && !Array.isArray(arg)), 'params passed in cannot be objects');
        }
        
        conditions = conditions === '(AllRecords)' ? 'true' : conditions;
        const q = `select * from ${table} where employeeTeamId=? and ${conditions}`;
        return dbConnection.querySkipOwnerCheckFirstRow(q, ownerId, ...args);
    };
    dbConnection.updateSkipOwnerCheck = (a1, a2, criteria, opts) => {
        a2 = transformJsonToStr(a2);
        const countChanges = dbConnection._origUpdate(a1, a2, criteria);
        if (countChanges === 0 && !opts?.noChangesOk) {
            throw new Error('update did not affect any rows, use updateNoChangesOk if this is expected');
        }
        if (countChanges > 1 && !opts?.multiChangesOk) {
            throw new Error('update affected many rows, use multiChangesOk if this is expected');
        }

        return countChanges;
    };
    dbConnection.updateChecked = (ownerId, a1, a2, criteria, opts) => {
        criteria = { ...criteria, employeeTeamId: ownerId };
        return dbConnection.updateSkipOwnerCheck(a1, a2, criteria, opts);
    };
    dbConnection.deleteSkipOwnerCheck = (a1, a2, opts) => {
        const countChanges = dbConnection._origDelete(a1, a2);
        if (countChanges === 0 && !opts?.noChangesOk) {
            throw new Error('delete did not affect any rows, use updateNoChangesOk if this is expected');
        }
        if (countChanges > 1 && !opts?.multiChangesOk) {
            throw new Error('delete affected many rows, use multiChangesOk if this is expected');
        }

        return countChanges;
    };
    dbConnection.deleteChecked = (ownerId, a1, criteria, opts) => {
        criteria = { ...criteria, employeeTeamId: ownerId };
        return dbConnection.deleteSkipOwnerCheck(a1, criteria, opts);
    };
    dbConnection.insertSkipOwnerCheck = (a1, a2, ...args) => {
        a2 = transformJsonToStr(a2);
        const countChanges = dbConnection._origInsert(a1, a2, ...args);
        assertTrue(countChanges >= 1, 'insert failed');
        return countChanges;
    };
    dbConnection.insertChecked = (ownerId, a1, a2, ...args) => {
        a2 = { ...a2, employeeTeamId: ownerId };
        return dbConnection.insertSkipOwnerCheck(a1, a2, ...args);
    };
    
    // be careful about replace() because it deletes the existing row and then inserts a new one,
    // we should be ok bc we are in a transaction, but something to be careful about.
    // and for triggers or cascade delete it could create issues.
    dbConnection.replaceSkipOwnerCheck = (table, record, ...args) => {
        record = transformJsonToStr(record);
        return dbConnection._origReplace(table, record, ...args);
    }
    dbConnection.replaceChecked = (ownerId, table, record, ...args) => {
        return dbConnection.replaceSkipOwnerCheck(table, {...record, employeeTeamId:ownerId}, ...args)
    }
    dbConnection.sqlSkipOwnerCheck = (...args) => {
        return dbConnection.prepare(...args)
    }
}

export function getCount_SkipOwnerCheckFromDb(conn, query, paramsToSend=undefined) {
    assertTrue(query.includes('whatToCount'))
    if (query.includes('?')) {
        assertTrue(paramsToSend !== undefined)
    }
    
    let c = conn.sql_SkipOwnerCheck(query)
    c = query.includes('?') ? c.all(paramsToSend)[0] : c.all()[0]
    return c.whatToCount
}

export function escapeForLike(s) {
    return s.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

