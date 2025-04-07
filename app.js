import express from 'express';
import http from 'http';
import nunjucks from 'nunjucks';

import { BasicWebRoutes } from './views/web-routes.js';
import { ApiRoutes } from './api/api-routes.js';
import {
    getPathOnDisk,
    getPortNumber,
    isProduction,
    resetCwd,
} from './server-utils/lowest-level-utils.js';
import { jwtHandlingRunOnAppSetup } from './server-utils/jwt-handling.js';
import { logInfo, shouldBreakOnExceptions_Enable } from './server-utils/logging.js';
import { startSqliteDbOnAppSetup } from './api/db/schema.js';
import { respondToServerErr } from './server-utils/err-handling.js';
import { runProtectedByLockAndTxn } from './server-utils/api-route-helpers.js';
import { osPlatform, pathBaseName, pathJoin } from './server-utils/file-util-wrappers.js';
import { createProxyMiddleware } from 'http-proxy-middleware';

// If using nodemon, remember to specify only to watch .js extension changes.
// By default it watches .json changes too - which is not good because
// we persist state to disk by writing a json, causing many server reboots.
// `nodemon ./app.js -e js` limits to js.

// Create the express instance
const app = express();
resetCwd();
const rootdir = getPathOnDisk();

// Start nunjucks and connect it to express
// Tell nunjucks that in can load templates from either the views directory or the api directory
nunjucks.configure(['views', 'api'], {
    autoescape: true,
    express: app,
});

const useSassMiddleware = false;
if (useSassMiddleware) {
    // used to have "node-sass-middleware": "~1.0.1",
    // import sassMiddleware from 'node-sass-middleware';
    // if indentedSyntax is true, use .sass instead of .scss
    const sassMiddleware = {}
    app.use(
        sassMiddleware({
            src: pathJoin(rootdir, 'bootstrap'),
            dest: pathJoin(rootdir, 'public'),
            indentedSyntax: true,
            sourceMap: true,
        })
    );
}


// Host static files
app.use(express.static(pathJoin(rootdir, 'public'), { maxAge: '1hr', cacheControl: true }));

// Needed, otherwise post.body is not available
// without the limit:15mb, cannot upload files
app.use(express.json({ limit: '15mb' }));

const useJwtAuth = false;
if (useJwtAuth) {
    jwtHandlingRunOnAppSetup(app);
}

const continueStartingServer = await startSqliteDbOnAppSetup();

// add routes
// The module express-crud-router can be useful
await BasicWebRoutes.Register(app);
await ApiRoutes.Register(app);

// you can optionally have a debugging page for db access.
const enablePhpLiteAdmin = false
if (enablePhpLiteAdmin) {
    app.use(
        '/phpliteadmin',
        createProxyMiddleware({
            target: 'http://localhost:8001',
            changeOrigin: true,
        })
    );
}


// Create the server
if (continueStartingServer) {
    //~ enableBackgroundTasks(runProtectedByLockAndTxn);
    const server = http.createServer(app);
    server.listen(getPortNumber().toString(), () => {
        logInfo(`listening on port ${getPortNumber()}...`);
    });
}

if (pathBaseName(process.argv[1]) !== pathBaseName(import.meta.url)) {
    console.log("You are apparently importing this file instead of running it directly.")
}

shouldBreakOnExceptions_Enable();

// References:
// https://regbrain.com/article/bootstrap-express
// https://www.edureka.co/blog/rest-api-with-node-js
