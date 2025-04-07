import {
    cookieTokenKeyAdmin,
    cookieTokenKeyUser,
    doSignoutImpl,
} from '../server-utils/jwt-handling.js';

import {
    registerGetUsingDb,
    registerPost,
    registerPostUsingDb,
} from '../server-utils/apiroutehelpers.js';

import { ApiRoutesAutoRoutes } from './apiroutesAutoRoutes.js';

/*
developed by Ben Fisher(moltenform.com)
Proprietary software
Register api routes.
*/

export class ApiRoutes {
    static async Register(app) {
        await ApiRoutesAutoRoutes.Register(app);
        await CrudLogic.Register(app);
        await ApiRoutes.Register(app);

        registerGetUsingDb(app, '/public/example-get/:p1', async (req, res, conn) => {
            res.send({ result: `called api with param ${req.params.p1}` });
        });
        registerPost(app, '/public/example-post', async (req, res) => {
            return { result : 1};
        });
    }
}
