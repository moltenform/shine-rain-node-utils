
import {
    registerGetUsingDb,
    registerPost,
    registerPostUsingDb,
} from '../server-utils/api-route-helpers.js';

import { ApiRoutesAutoRoutes } from './api-routes-auto-routes.js';

/*
developed by Ben Fisher(moltenform.com)
Register api routes.
*/

export class ApiRoutes {
    static async Register(app) {
        await ApiRoutesAutoRoutes.Register(app);

        registerGetUsingDb(app, '/public/example-simple', async (req, res, conn) => {
            res.send({ value: 123 });
        });
        registerGetUsingDb(app, '/public/example-get/:p1', async (req, res, conn) => {
            res.send({ result: `called api with param ${req.params.p1}` });
        });
        registerPost(app, '/public/example-post', async (req, res) => {
            return { result : 1};
        });
    }
}
