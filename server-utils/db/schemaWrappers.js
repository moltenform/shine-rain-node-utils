

import _ from 'lodash';
import { assertTrue } from "../../server-utils/jsutils.js";

export function escapeForLike(s) {
    return s.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

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
        throw new Error('use queryAnyOrganization instead');
    };
    dbConnection.queryFirstRow = (...args) => {
        throw new Error('use queryAnyOrganizationFirstRow instead');
    };
    dbConnection.update = (...args) => {
        throw new Error('use updateAnyOrganization instead');
    };
    dbConnection.insert = (...args) => {
        throw new Error('use insertWithoutValidationAnyOrganization instead');
    };
    dbConnection.delete = (...args) => {
        throw new Error('use deleteAnyOrganization instead');
    };
    dbConnection.replace = (...args) => {
        throw new Error('use replaceAnyOrganization instead');
    };
    dbConnection.queryAnyOrganization = (...args) => {
        if (args[0]) {
            assertTrue(typeof args[0] === 'string', `query must be a string`)
        }

        const ret = dbConnection._origQuery(...args).map(transformStrToJson);
        return ret;
    };
    dbConnection.queryAnyOrganizationFirstRow = (...args) => {
        if (args[0]) {
            assertTrue(typeof args[0] === 'string', `query must be a string`)
        }

        const ret = dbConnection._origQueryFirstRow(...args);
        return transformStrToJson(ret);
    };
    dbConnection.updateAnyOrganization = (a1, a2, criteria, opts) => {
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
    dbConnection.deleteAnyOrganization = (a1, a2, opts) => {
        const countChanges = dbConnection._origDelete(a1, a2);
        if (countChanges === 0 && !opts?.noChangesOk) {
            throw new Error('delete did not affect any rows, use updateNoChangesOk if this is expected');
        }
        if (countChanges > 1 && !opts?.multiChangesOk) {
            throw new Error('delete affected many rows, use multiChangesOk if this is expected');
        }

        return countChanges;
    };
    dbConnection.insertWithoutValidationAnyOrganization = (a1, a2, ...args) => {
        a2 = transformJsonToStr(a2);
        const countChanges = dbConnection._origInsert(a1, a2, ...args);
        assertTrue(countChanges >= 1, 'insert failed');
        return countChanges;
    };
    // be careful about replace() because it deletes the existing row and then inserts a new one,
    // we should be ok bc we are in a transaction, but something to be careful about.
    // and for triggers or cascade delete it could create issues.
    dbConnection.replaceAnyOrganization = (table, record, ...args) => {
        record = transformJsonToStr(record);
        return dbConnection._origReplace(table, record, ...args);
    }
    dbConnection.sqlAnyOrganization = (...args) => {
        return dbConnection.prepare(...args)
    }
}

export function getCountAnyOrganizationFromDb(conn, query, paramsToSend=undefined) {
    assertTrue(query.includes('whatToCount'))
    if (query.includes('?')) {
        assertTrue(paramsToSend !== undefined)
    }
    
    let c = conn.sqlAnyOrganization(query)
    c = query.includes('?') ? c.all(paramsToSend)[0] : c.all()[0]
    return c.whatToCount
}

