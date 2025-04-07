
//import { assertTrue } from '../server-utils/jsutils.js';
import { registerGet } from '../server-utils/apiroutehelpers.js';
// import { cookieTokenKeyAdmin, cookieTokenKeyUser, cSecret, jwtHandlingRunOnAppSetup } from '../server-utils/jwt-handling.js';
// import jwt from 'jsonwebtoken';
// import { getPathOnDisk } from '../server-utils/lowest-level-utils.js';


/*
developed by Ben Fisher(moltenform.com)
Proprietary software
Set up web routes
*/

 
function looksLoggedIn(req, whichToken) {
    if (!req.signedCookies || !req.signedCookies[whichToken]) {
        return false
    }
    try {
        jwt.verify(req.signedCookies[whichToken], cSecret)
        return true
    } catch (error) {
        return false
    }
}

export class BasicWebRoutes {
    static async Register(app) {
        registerGet(app, '/', async (req, res) => {
            res.redirect('/public/sample-public');
        });
    }
}






