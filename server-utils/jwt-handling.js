import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

import {
    logErr,
    logWarn,
    shouldBreakOnExceptions_Disable,
    shouldBreakOnExceptions_Enable,
} from './logging.js';
import { isProduction, readJsonFileAsync } from './lowest-level-utils.js';
import {
    getReadOnlyDbConn,
    getReadWriteDbConn_CallOnlyFromApiRouteHelpers,
} from '../api/db/schema.js';
import {
    HttpException,
    HttpException_Inactive,
    HttpException_InvalidCode,
    HttpException_MustBeAnEe,
    respondToServerErr,
} from './err-handling.js';

import { crptMatchesExisting } from './lowest-level/crpt.js';
import createHttpError from 'http-errors';
import { assertTrue } from './jsutils.js';

/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */

const _credsOnce = await readJsonFileAsync('./.creds.json');
export const cSecret = _credsOnce._cSecret;
export const cCookieSecret = _credsOnce._cCookieSecret;
assertTrue(cSecret && cCookieSecret, 'secret not in json');

export function jwtHandlingRunOnAppSetup(app) {
    app.use(cookieParser(cCookieSecret));
}

export function customAuthRequiredMiddleware_User(req, res, next) {
    return customAuthRequiredMiddlewareGeneral(req, res, next, cookieTokenKeyUser);
}

export function customAuthRequiredMiddleware_Admin(req, res, next) {
    return customAuthRequiredMiddlewareGeneral(req, res, next, cookieTokenKeyAdmin);
}

export function customAuthRequiredMiddlewareGeneral(req, res, next, cookieTokenKey) {
    try {
        const gt = customAuthRequiredMiddlewareImpl(req, res, cookieTokenKey);
        if (gt !== false) {
            next();
        }
    } catch (e) {
        respondToServerErr(e, req, res, 'internalErr', 500);
        return;
    }
}

// This is middleware that checks the JWT token in the cookie to see if it's valid
// if it is, we call next(), otherwise we send a 401 Unauthorized
const customAuthRequiredMiddlewareImpl = (req, res, cookieTokenKey) => {
    req.customAuthRequiredMiddlewareResult = req.customAuthRequiredMiddlewareResult || {};

    // We grab the token from the cookies
    const token = req.signedCookies[cookieTokenKey];
    let payload;

    // jwt verify throws an exception when the token isn't valid
    try {
        shouldBreakOnExceptions_Disable(); // this is a known commonly-hit exception, no need to hit debugger
        if (!token) {
            throw new Error('cookie not set');
        }

        payload = jwt.verify(token, cSecret);
    } catch (error) {
        respondToServerErr(error, req, res, 'authFail', 401);
        return false;
    } finally {
        shouldBreakOnExceptions_Enable();
    }

    // maybe overkill, since the cookie expires, but
    // check the access again. not great for performance. does allow a swift revoke though.
    try {
        const mockReq = {
            customAuthRequiredMiddlewareResult: {
                [cookieTokenKey]: {
                    loggedInId: payload.loggedInId,
                },
            },
        };
        const stHere = getCurrentCompanyAndStateOrThrowSq(
            mockReq,
            getReadOnlyDbConn(),
            cookieTokenKey
        );
        assertTrue(
            cookieTokenKey === cookieTokenKeyAdmin ? stHere.admin.email : stHere.ee.email,
            'Not found'
        );
    } catch (error) {
        respondToServerErr(error, req, res, 'isFromDoubleCheck', 401);
        return false;
    }

    // attach our data to Express's request object
    req.customAuthRequiredMiddlewareResult[cookieTokenKey] = {
        loggedInId: payload.loggedInId,
    };
};

export async function doPasswordSigninImpl(req, res, conn, cookieTokenKey) {
    // intentional sleep, make brute force attacks harder.
    if (isProduction()) {
        await sleep(1000);
    }

    const data = {
        email: req.body.email.toLowerCase(),
        password: req.body.password,
    };

    const isAdmin = true;
    assertTrue(cookieTokenKey === cookieTokenKeyAdmin);

    try {
        let found = personSearcherAllCompaniesSq(conn, isAdmin, 'email', data.email);
        found = found.admin;
        if (!crptMatchesExisting(data.password, found.password)) {
            throw new Error('incorrect password');
        }

        let mockReq = {
            customAuthRequiredMiddlewareResult: {
                [cookieTokenKey]: { loggedInId: found.adminId },
            },
        };
        const stFromHere = getCurrentCompanyAndStateOrThrowSq(
            mockReq,
            conn,
            cookieTokenKeyAdmin
        );
        const newAdminInfo = { ...stFromHere.admin.adminInfo, lastLogin: Date.now() };
        stFromHere.conn.updateC(
            stFromHere.companyId,
            'Admins',
            { adminInfo: newAdminInfo },
            { adminId: stFromHere.admin.adminId }
        );

        // cookie expires in 100 days, that way we can have a better error msg when creds expire due to timeout.
        // it will only actually let you log in for an hour though.
        const cookieMillisecondsLifetime = 100 * 24 * 60 * 60 * 1000;
        const jwtLifetime = '7 days';
        const payload = {
            loggedInId: found.adminId,
        };

        // jwt expires in 1hr
        res.cookie(cookieTokenKey, jwt.sign(payload, cSecret, { expiresIn: jwtLifetime }), {
            sameSite: 'strict',
            httpOnly: true,
            signed: true,
            expires: new Date(Date.now() + cookieMillisecondsLifetime),
        });

        return { loggedInId: payload.loggedInId };
    } catch (e) {
        if (e.message === 'No person found' || e.message === 'incorrect password') {
            throw new HttpException(400, e.message);
        }
        throw e;
    }
}

export async function doSignoutImpl(req, res, cookieTokenKey) {
    // We just clear the token cookie to log the user out.
    res.clearCookie(cookieTokenKey, {
        sameSite: 'strict',
        httpOnly: true,
        signed: true,
    });
}

export const cookieTokenKeyUser = 'shine-rain-node-utils-tokenuser';
export const cookieTokenKeyAdmin = 'shine-rain-node-utils-tokenadmin';
