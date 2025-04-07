import BetterSqliteHelper from 'better-sqlite3-helper';
import { getPathOnDisk } from '../../server-utils/lowest-level-utils.js';

import { makeMyPatches } from './schemaWrappers.js';
import {
    fsExistsSync,
    fsUnlinkAsyncIfExists,
    listFilesInDir,
    pathDirName,
} from '../../server-utils/file-util-wrappers.js';
import _ from 'lodash';
import { assertEq, assertTrue } from '../../server-utils/jsutils.js';

/*
 currently db methods are SYNC and not ASYNC
 pros of making them sync:
        node is singlethreaded, so no race conditions where another write comes before our write
            (although our reader-writer lock also helps prevent issues unless a GET is doing writes)
        the better-sqlite npm module also uses synchronous functions for the same reason
        all it takes is one await and there's now a window for race conditions bc it might switch contexts 
 pros of making them async
        supports future move to dbs like postgres
*/

async function startNewDb() {
    if (fsExistsSync(dbPath)) {
        throw new Error('db file already exists. please delete it manually and try again');
    }

    const db = BetterSqliteHelper({
        path: dbPath,
        readonly: false,
        fileMustExist: false,
        WAL: true, // automatically enable 'PRAGMA journal_mode = WAL'
        migrate: {
            table: 'migration',
            migrationsPath: './api/db/migrations'
        }
    });

    // use a large page size.
    db.exec('pragma page_size=32768;');
    makeMyPatches(db, transformJsonToStr, transformStrToJson);
    lookForJsonFields(db);
    checkCompanyIdFieldsHaveAnIndex(db);
    
    db.insertWithoutValidationAnyCompany(`Metadata`, {
        MetadataId: genUuid(),
        schemaVersion: 2,
        countStaleIndexedDocuments: 0,
    });

    console.log('Complete.');
}

function loadExistingDb() {
    if (!fsExistsSync(dbPath)) {
        throw new Error('no db file. please run node app.js --startNewDbFile');
    }

    const db = BetterSqliteHelper({
        path: dbPath,
        readonly: false,
        fileMustExist: true,
        WAL: true, // automatically enable 'PRAGMA journal_mode = WAL'
        migrate: {
            table: 'migration',
            migrationsPath: './api/db/migrations'
        }
    }); 

    db.exec('pragma page_size=32768;');
    makeMyPatches(db, transformJsonToStr, transformStrToJson);
    lookForJsonFields(db);
    checkCompanyIdFieldsHaveAnIndex(db);

    let got = db.queryAnyCompanyFirstRow(`select schemaVersion from Metadata`);
    if (got?.schemaVersion === 1) {
        // It's ok to import a previous database from when before migration support was added.
        db.updateAnyCompany(`Metadata`, { schemaVersion: 2}, { schemaVersion: 1});
        got = db.queryAnyCompanyFirstRow(`select schemaVersion from Metadata`);
    }

    assertEq(
        2,
        parseInt(got?.schemaVersion),
        'different or missing schema version in db. please delete the db and re-run node app.js --startNewDbFile'
    );

    return db;
}

let dbPath = getPathOnDisk() + '/config/db.db';
export async function startTestDbMode() {
    dbPath = getPathOnDisk() + '/config/testdb.db';
    if (fsExistsSync(dbPath)) {
        await fsUnlinkAsyncIfExists(dbPath);
    }

    await startNewDb();
}

export function getReadWriteDbConn_CallOnlyFromApiRouteHelpers() {
    const c = BetterSqliteHelper();
    makeMyPatches(c, transformJsonToStr, transformStrToJson);
    assertTrue(_.size(colsThatAreJson) > 0, "We expect lookForJsonFields to have been called by this point.")
    return c;
}

export function getReadOnlyDbConn() {
    let c = BetterSqliteHelper();
    makeMyPatches(c, transformJsonToStr, transformStrToJson);
    assertTrue(_.size(colsThatAreJson) > 0, "We expect lookForJsonFields to have been called by this point.")
    return {
        queryC: (...args) => c.queryC(...args),
        queryCFirstRow: (...args) => c.queryCFirstRow(...args),
        queryAnyCompany: (...args) => c.queryAnyCompany(...args),
        queryAnyCompanyFirstRow: (...args) => c.queryAnyCompanyFirstRow(...args),
        sqlAnyCompany: (q, ...args) => {
            assertTrue(
                q.toLowerCase().startsWith('select '),
                'query must be a select'
            );
            return c.sqlAnyCompany(q, ...args);
        },
        update: () => {
            throw new Error('method disabled in view only mode');
        },
        insert: () => {
            throw new Error('method disabled in view only mode');
        },
        exec: (s) => {
            if (
                ['BEGIN TRANSACTION', 'COMMIT TRANSACTION', 'ROLLBACK TRANSACTION'].includes(
                    s.toUpperCase()
                )
            ) {
                return c.exec(s);
            }
            throw new Error('method disabled in view only mode');
        },
    };
}

export async function startSqliteDbOnAppSetup() {
    if (process.argv.includes('--nukeExistingDb')) {
        assertTrue(fsExistsSync(pathDirName(dbPath)));
        for (let fullPath of listFilesInDir(pathDirName(dbPath))) {
            fullPath = fullPath.replace(/\\/g, '/');
            if (
                fullPath.includes('/db') &&
                !fullPath.endsWith('.js') &&
                !fullPath.endsWith('.json')
            ) {
                await fsUnlinkAsyncIfExists(fullPath);
            }
        }
    }

    if (process.argv.includes('--startNewDbFile')) {
        await startNewDb();
        return false;
    } else {
        loadExistingDb();
        return true;
    }
}

const colsThatAreJson = {};
function lookForJsonFields(db) {
    const colTypesSeen = {}
    const table_list = db.queryAnyCompany(`PRAGMA table_list;`);
    for (let table of table_list) {
        if (!table.name.includes('sqlite')) { // skip internal tables
            if (table.name.match(/^[a-zA-Z0-9_-]+$/)) { // all alphanumeric; no injection risk
                const fields = db.queryAnyCompany(`PRAGMA table_info(${table.name})`); 
                for (let field of fields) {
                    if (field.name.toString().endsWith('_json')) {
                        assertTrue(['json', undefined].includes(colTypesSeen[field.name.toString().replace('_json', '')]), 'conflict json field', field.name);
                        colTypesSeen[field.name.toString().replace('_json', '')] = 'json';

                        colsThatAreJson[field.name.toString()] = true;
                    } else {
                        assertTrue(['not-json', undefined].includes(colTypesSeen[field.name.toString()]), 'conflict json field', field.name);
                        colTypesSeen[field.name.toString()] = 'not-json';
                    }
                }
            }
        }
    }
}

function transformJsonToStr(row) {
    if (!row) {
        return row;
    }

    let results = {};
    for (let colName in row) {
        if (colsThatAreJson[colName + '_json']) {
            results[colName + '_json'] = _.isNil(row[colName])
                ? undefined
                : JSON.stringify(row[colName]);
        } else {
            results[colName] = row[colName];
        }
    }

    return results;
}

function transformStrToJson(row) {
    if (!row) {
        return row;
    }

    let results = {};
    for (let colName in row) {
        if (colsThatAreJson[colName]) {
            results[colName.replace('_json', '')] = _.isNil(row[colName])
                ? undefined
                : JSON.parse(row[colName]);
        } else {
            results[colName] = row[colName];
        }
    }

    return results;
}
