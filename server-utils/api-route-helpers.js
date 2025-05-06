
import { getAdminMiddlewareList, getUserMiddlewareList } from './server-feature-jwt.js';
import { logInfo } from './logging.js';
import RWLock from 'async-rwlock';
import { getReadOnlyDbConn, getReadWriteDbConn_CallOnlyFromApiRouteHelpers } from './db/schemaConnection.js';
import { wrapResponseInTryCatch } from './err-handling.js';
import { multerUploadInstance } from './server-feature-uploads.js';


/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */


function registerRouteLvl4(app, route, method, fnAsyncCallback) {
    // get array of middleware callbacks
    const arrMiddleware = getMiddleware(app, route, method, fnAsyncCallback)
    
    // tell express to add the route
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
        if (dbNeeded === DbAccessLevels.DbNone) {
            return fnAsyncCallback(req, res)
        } else {
            const f = (dbconn)=>fnAsyncCallback(req, res, dbconn)
            assertTrue(dbNeeded === DbAccessLevels.DbRead || dbNeeded === DbAccessLevels.DbReadWrite);
            return runProtectedByLockAndTxn(f, dbNeeded === DbAccessLevels.DbReadWrite, res)
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
    return registerRouteLvl1(app, route, 'post', DbAccessLevels.DbReadWrite, fnAsyncCallback)
}

// it's up to the caller to call res.send()
export function registerGetUsingDb(app, route, fnAsyncCallback) {
    return registerRouteLvl1(app, route, 'get', DbAccessLevels.DbRead, fnAsyncCallback)
}

export function registerPost(app, route, fnAsyncCallback) {
    return registerRouteLvl1(app, route, 'post', DbAccessLevels.DbNone, fnAsyncCallback)
}

// it's up to the caller to call res.send()
export function registerGet(app, route, fnAsyncCallback) {
    return registerRouteLvl1(app, route, 'get', DbAccessLevels.DbNone, fnAsyncCallback)
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
        debugger;
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
    } else if (route.startsWith('/user')) {
        arrMiddleware = getUserMiddlewareList()
        if (route.includes('/this_route_uses_multer/')) {
            arrMiddleware.push(multerUploadInstance.single("incomingFile"))
        }
        arrMiddleware.push(fnAsyncCallback)
    } else if (route.startsWith('/admin')) {
        arrMiddleware = getAdminMiddlewareList()
        if (route.includes('/this_route_uses_multer/')) {
            arrMiddleware.push(multerUploadInstance.single("incomingFile"))
        }
        arrMiddleware.push(fnAsyncCallback)
    } else {
        throw new Error(`path must start with /public /user /admin`)
    }

    return arrMiddleware
}


const DbAccessLevels = {
    DbNone: 0,
    DbRead: 1,
    DbReadWrite: 2
}
