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

import * as serverUtils from '../server-utils/jsutils.js';
import { AdminActions } from './businesslogic/doAdminAction.js';
import { getCurrentCompanyAndStateOrThrowSq } from '../server-utils/dbhelpers.js';
import { EeActions } from './businesslogic/doEeAction.js';
import { EeRetrievals } from './businesslogic/doEeRetrieval.js';
import { ApiRoutesAutoRoutes } from './apiroutesAutoRoutes.js';
import { CrudLogic } from './crudlogic/crudlogic.js';
import { UploadSupport } from './uploadSupport.js';
import { AdminRetrievals } from './businesslogic/doAdminRetrieval.js';
import { drawHtmlRawData } from './businesslogic/dataEventsComputed/pointsComputedBase.js';

/*
developed by Ben Fisher(moltenform.com)
Proprietary software
Register api routes.
*/

export class ApiRoutes {
    static async Register(app) {
        await UploadSupport.Register(app);
        await ApiRoutesAutoRoutes.Register(app);
        await CrudLogic.Register(app);


        registerGetUsingDb(app, '/public/example-get/:p1', async (req, res, conn) => {
            res.send({ result: `called api with param ${req.params.p1}` });
        });
        registerPost(app, '/public/example-post', async (req, res) => {
            return { result : 1};
        });
    }
}
