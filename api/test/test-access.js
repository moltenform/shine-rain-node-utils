import jwt from 'jsonwebtoken';
import _ from 'lodash';

import * as serverUtils from '../../server-utils/jsutils.js';
import {
    cookieTokenKeyAdmin,
    cookieTokenKeyUser,
    cSecret,
    customAuthRequiredMiddleware_User,
    doPasswordSigninImpl,
} from '../../server-utils/jwt-handling.js';
import { resetCwd } from '../../server-utils/lowest-level-utils.js';
import { onPost as onPostSignupAdmin } from '../autoroutes/public/signupadmin.route.js';
import {
    getReadOnlyDbConn,
    getReadWriteDbConn_CallOnlyFromApiRouteHelpers,
} from '../businesslogic/schema.js';
import { personSearcherAllCompaniesSq } from '../../server-utils/dbhelpers.js';
import {
    shouldBreakOnExceptions_Disable,
    shouldBreakOnExceptions_Enable,
} from '../../server-utils/logging.js';

/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */

export async function testAccess() {
    await testSignIns();
    await testJwt();
}

async function testSignIns() {
    const conn = getReadWriteDbConn_CallOnlyFromApiRouteHelpers();
    const testTryLogin = async (email, password, expectFailureMsg, expectResults) => {
        const fakeReq = { body: { email, password } };
        const fakeRes = { cookie: () => {}, json: () => {} };
        let results;
        if (expectFailureMsg) {
            shouldBreakOnExceptions_Disable();
        }

        try {
            results = await doPasswordSigninImpl(fakeReq, fakeRes, conn, cookieTokenKeyAdmin);
        } catch (e) {
            if (expectFailureMsg) {
                serverUtils.assertTrue(
                    e.toString().includes(expectFailureMsg),
                    `'${e.toString()}' did not include ${expectFailureMsg}`
                );
            } else {
                throw new Error('did not expect an exception');
            }
        } finally {
            if (expectFailureMsg) {
                shouldBreakOnExceptions_Enable();
            }
        }

        if (!expectFailureMsg) {
            serverUtils.assertEq(results, expectResults);
        }
    };

    const fakeRes = { cookie: () => {}, json: () => {} };
    await onPostSignupAdmin(
        { body: { name: 'nm1', email: 'e1@e1.com', password1: 'pw', password2: 'pw' } },
        fakeRes,
        conn,
        true
    );
    await onPostSignupAdmin(
        {
            body: {
                name: 'nm2',
                email: 'e2@E2.com', // note casing will be normalized
                password1: 'pw2',
                password2: 'pw2',
            },
        },
        fakeRes,
        conn,
        true
    );

    // should not be able to use a dupe email address
    await serverUtils.assertThrowAsync(
        async () =>
            onPostSignupAdmin(
                {
                    body: {
                        name: 'nm3',
                        email: 'e2@e2.com',
                        password1: 'pw3',
                        password2: 'pw3',
                    },
                },
                fakeRes,
                conn,
                true
            ),
        'Already exists user'
    );

    const person1 = personSearcherAllCompaniesSq(conn, true, 'email', 'e1@e1.com');
    const person2 = personSearcherAllCompaniesSq(conn, true, 'email', 'e2@e2.com');

    // try a succesful login
    await testTryLogin('e1@e1.com', 'pw', '', { loggedInId: person1.admin.adminId });
    await testTryLogin('e2@e2.com', 'pw2', '', { loggedInId: person2.admin.adminId });
    // try with different casing
    await testTryLogin('E2@E2.com', 'pw2', '', { loggedInId: person2.admin.adminId });
    // wrong email
    await testTryLogin('e1@e1.com2', 'pw', 'No person found', '');
    // wrong password
    await testTryLogin('e1@e1.com', 'PW', 'Incorrect password', '');
}

async function testJwt() {
    const testToken = jwt.sign({ username: 'testuser1', access: 'all' }, cSecret, {
        expiresIn: '30 min',
    });
    // try read a valid cookie
    const gotPayload = jwt.verify(testToken, cSecret);
    serverUtils.assertEq('testuser1', gotPayload.username);
    serverUtils.assertEq('all', gotPayload.access);

    // try reading an invalid cookie
    const modifyFirstChar = (s) => String.fromCharCode(s.charCodeAt(0) + 1) + s.slice(1);
    serverUtils.assertEq('223', modifyFirstChar('123'));
    serverUtils.assertThrow(() => jwt.verify(testToken + 'a', cSecret));
    serverUtils.assertThrow(() => jwt.verify(testToken.slice(1, -1), cSecret));
    serverUtils.assertThrow(() => jwt.verify(modifyFirstChar(testToken), cSecret));

    // try reading one that times out
    const testTokenTimeout = jwt.sign({ email: 'abcdefg' }, cSecret, {
        expiresIn: '3 seconds',
    });
    const got = jwt.verify(testTokenTimeout, cSecret);
    serverUtils.assertEq('abcdefg', got.email);
    await serverUtils.sleep(5 * 1000);
    serverUtils.assertThrow(() => jwt.verify(testTokenTimeout, cSecret), 'expired');
}
