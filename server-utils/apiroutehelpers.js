
import { customAuthRequiredMiddleware_Admin, customAuthRequiredMiddleware_User } from './jwt-handling.js';
import { logInfo } from './logging.js';
import {  multerUploadInstance } from '../api/uploadSupportMulter.js';
import RWLock from 'async-rwlock';
import { getReadOnlyDbConn, getReadWriteDbConn_CallOnlyFromApiRouteHelpers } from '../api/businesslogic/schema.js';
import { wrapResponseInTryCatch } from './err-handling.js';


/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */

function registerRouteLvl4(app, route, method,  fnAsyncCallback) {
    // add the handler
    const arrMiddleware = getMiddleware(app, route, method, fnAsyncCallback)
    app[method](route, arrMiddleware)
}

function registerRouteLvl3(app, route, method,  fnAsyncCallback) {
    // add logging
    const fnWrapped = async (req, res, ...args) => {
        logInfo(`----- START ${req?.originalUrl}`);
        const ret = await fnAsyncCallback(req, res, ...args)
        if (![200, 304].includes(res.statusCode) ||  (res.respondToServerErrStatusCode && res.respondToServerErrStatusCode !== 200)) {
            logInfo(`----- PROBLEM ${res.respondToServerErrStatusCode} ${res.statusCode} ${req?.originalUrl} ${res.locals?.msg} `);            
        } else {
            logInfo(`----- OK ${res.statusCode} ${req?.originalUrl}`);            
        }
        return ret
    }

    return registerRouteLvl4(app, route, method, fnWrapped)
}

function registerRouteLvl2(app, route, method, dbNeeded, fnAsyncCallback) {
    // adds db connection
    const fnWrapped = async (req, res) => {
        if (dbNeeded === 'db-none') {
            return fnAsyncCallback(req, res)
        } else {
            const f = (dbconn)=>fnAsyncCallback(req, res, dbconn)
            return runProtectedByLockAndTxn(f, dbNeeded === 'db-read-write', res)
        }
    }
    return registerRouteLvl3(app, route, method, fnWrapped)
}

function registerRouteLvl1(app, route, method, dbNeeded, fnAsyncCallback) {
    // adds exception handling
    // adds checking if handler forgot to call send
    const fnWrapped = (req, res, ...args) => 
        wrapResponseInTryCatch(req, res, ()=>fnAsyncCallback(req, res, ...args))
    return registerRouteLvl2(app, route, method, dbNeeded, fnWrapped)
}

export function registerPostUsingDb(app, route, fnAsyncCallback) {
    return registerRouteLvl1(app, route, 'post', 'db-read-write', fnAsyncCallback)
}

// it's up to the caller to call res.send()
export function registerGetUsingDb(app, route, fnAsyncCallback) {
    return registerRouteLvl1(app, route, 'get', 'db-read', fnAsyncCallback)
}

export function registerPost(app, route, fnAsyncCallback) {
    return registerRouteLvl1(app, route, 'post', 'db-none', fnAsyncCallback)
}

// it's up to the caller to call res.send()
export function registerGet(app, route, fnAsyncCallback) {
    return registerRouteLvl1(app, route, 'get', 'db-none', fnAsyncCallback)
}

const lock = new RWLock.RWLock(); 
export function getDbLock() {
    return lock
}

export async function runProtectedByLockAndTxn(fn, needsWriteAccess, res=undefined) {
    const dbconn = needsWriteAccess ? getReadWriteDbConn_CallOnlyFromApiRouteHelpers() : getReadOnlyDbConn()
    try {
        // Because it's possible for async/await to cause context switches,
        // we need to prevent a ROLLBACK from stepping on concurrent db actions.
        // In the future we could consider a connection pool, or starting new connections every time,
        // because sqlite can potentially have its own lock to help for this scenario.
        // For now though to ensure correctness, just take a lock. We do get multiple readers,
        // it slightly hurts server performance but at least it's a real database and we get safety.
        if (needsWriteAccess) {
            await lock.writeLock()
        } else {
            await lock.readLock()
        }
        
        if (needsWriteAccess) {
            // having a transaction for reads does lead to better perf,
            // but then we couldn't do the multiple-readers one-writer pattern, bc the different readers would be committing haphazardly
            dbconn.exec('BEGIN TRANSACTION')
        }

        const ret = await fn(dbconn)
        if (needsWriteAccess) {
            if (res?.uncaughtExceptionThrownDuringHandler) {
                dbconn.exec('ROLLBACK TRANSACTION')
            } else {
                dbconn.exec('COMMIT TRANSACTION')
            }
        }
        return ret
    } catch (err) {
        if (needsWriteAccess) {
            dbconn.exec('ROLLBACK TRANSACTION')
        }
        throw err;
    } finally {
        lock.unlock() 
    }
}

function getMiddleware(app, route, method, fnAsyncCallback) {
    // get auth middleware based on routes
    let arrMiddleware
    if (route.startsWith('/public') || route === '/' || route === '/index' || route === '/index.html') {
        arrMiddleware = fnAsyncCallback
    } else if (route.startsWith('/private')) {
        arrMiddleware = [customAuthRequiredMiddleware_User]
        if (route.includes('/this_route_uses_multer/')) {
            arrMiddleware.push(multerUploadInstance.single("incomingFile"))
        }
        arrMiddleware.push(fnAsyncCallback)
    } else if (route.startsWith('/admin')) {
        arrMiddleware = [customAuthRequiredMiddleware_Admin]
        if (route.includes('/this_route_uses_multer/')) {
            arrMiddleware.push(multerUploadInstance.single("incomingFile"))
        }
        arrMiddleware.push(fnAsyncCallback)
    }

    return arrMiddleware
}

