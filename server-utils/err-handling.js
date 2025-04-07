import { isProduction } from './lowest-level-utils.js';
import * as serverUtils from './jsutils.js';
import { logErr } from './logging.js';
import jwt from 'jsonwebtoken';

const template = `
<html>
<script>
window.addEventListener('load', async ()=> {
    if (%%LOGOUT%%) {
        await fetch('/public/api/signout-ee')
        await fetch('/public/api/signout-admin')
    }
    
    if (document.referrer && document.referrer.toString().includes('/admin/')) {
        document.getElementById('idLinkBack').href = '/public/signinadmin'
    }
    if (document.referrer && document.referrer.toString().includes('/private/')) {
        document.getElementById('idLinkBack').href = '/public/signinee'
    }
})
</script>

<pre>
%%DEBUGINFO%%
</pre>
<br/><br/>
%%MSG%%
<br/><br/>
<a id="idLinkBack" href="/">Return to home page.</a>
</html>
`;

export class HttpException extends Error {
    constructor(status, message = null) {
        super(message);
        this.name = 'HttpException';
        this.status = status;
    }

    toString() {
        return JSON.stringify(this);
    }
}

export const HttpException_AccessDenied = () => new HttpException(401, 'access denied');
export const HttpException_CodeExpired = () => new HttpException(401, 'code expired');
export const HttpException_SessionExpired = () => new HttpException(401, 'session expired');
export const HttpException_InvalidCode = () => new HttpException(401, 'invalid code');
export const HttpException_MustBeAnEe = () => new HttpException(401, 'must be an ee');
export const HttpException_Inactive = () => new HttpException(401, 'user is not active');
export const HttpException_UserNotFound = () => new HttpException(401, 'user not found');

export function respondToServerErr(error, req, res, mode, code = 500) {
    let ret = {
        msg: 'Unknown error',
        logYouOut: false,
    };

    switch (mode) {
        case 'isFromDoubleCheck':
            ret.logYouOut = true;
            break;
        case 'authFail':
            if (error instanceof jwt.TokenExpiredError) {
                error = HttpException_SessionExpired();
            } else {
                if (error.message === 'cookie not set') {
                    error = HttpException_AccessDenied();
                }    
            }
            // ret.logYouOut = true;
            break;
        case 'internalErr':
            // add the error, sometimes user should be able to see it
            if (error.toString().startsWith('Error: ')) {
                ret.msg = error.toString().replace('Error: ', '');
            } else {
                ret.msg = "We're sorry, an error has occurred. " + error.toString();
            }

            break;
        case 'internalErrForgotSend':
            ret.msg = "We're sorry, an error has occurred. No page was sent.";
            break;
        case '404':
            ret.msg = "We're sorry, the page cannot be found.";
            break;

        default:
            break;
    }

    // override the error message if we've been given an HttpException
    // this is clumsy but we actually want the client to be responsible for
    // presenting error messages, and we'll rely on upstream code to provide
    // reasonably consistent errors
    if (error instanceof HttpException) {
        ret.msg = error.message;
        res.locals.msg = error.message;
        code = error.status;
    }
    
    // only log serious status errors
    if (code === 500) {
        logErr(error);
        console.error(error);
    }
    
    res.respondToServerErrStatusCode = code;

    if (req.method?.toLowerCase() === 'get') {
        let sHtml = template;
        sHtml = sHtml.replace('%%LOGOUT%%', ret.logYouOut ? 'true' : 'false');
        sHtml = sHtml.replace('%%MSG%%', serverUtils.simpleSanitize(ret.msg));
        if (!isProduction()) {
            sHtml = sHtml.replace(
                '%%DEBUGINFO%%',
                serverUtils.simpleSanitize(error.toString())
            );
        }

        res.status(code).send(sHtml);
    } else {
        if (ret.logYouOut) {
            res.redirect(`/public/start/?msg=${ret.msg}`);
        } else {
            res.status(code).send(`{"error": "${ret.msg}"}`);
        }
    }
}

export async function wrapResponseInTryCatch(req, res, fn) {
    if (!res.wrapGetResponseInTryCatch_originalRenderMethod)
        res.wrapGetResponseInTryCatch_originalRenderMethod = res.render;
    if (!res.wrapGetResponseInTryCatch_originalRedirectMethod)
        res.wrapGetResponseInTryCatch_originalRedirectMethod = res.redirect;
    if (!res.wrapGetResponseInTryCatch_originalJsonMethod)
        res.wrapGetResponseInTryCatch_originalJsonMethod = res.json;
    if (!res.wrapGetResponseInTryCatch_originalSendMethod)
        res.wrapGetResponseInTryCatch_originalSendMethod = res.send;
    if (!res.wrapGetResponseInTryCatch_originalSendFileMethod)
        res.wrapGetResponseInTryCatch_originalSendFileMethod = res.sendFile;
    res.send = (...args) => {
        res.wrapGetResponseInTryCatch_calledSend = true;
        res.wrapGetResponseInTryCatch_originalSendMethod(...args);
    };
    res.sendFile = (...args) => {
        res.wrapGetResponseInTryCatch_calledSend = true;
        res.wrapGetResponseInTryCatch_originalSendFileMethod(...args);
    };
    res.json = (...args) => {
        res.wrapGetResponseInTryCatch_calledSend = true;
        res.wrapGetResponseInTryCatch_originalJsonMethod(...args);
    };
    res.redirect = (...args) => {
        res.wrapGetResponseInTryCatch_calledSend = true;
        res.wrapGetResponseInTryCatch_originalRedirectMethod(...args);
    };
    res.render = (...args) => {
        res.wrapGetResponseInTryCatch_calledSend = true;
        res.wrapGetResponseInTryCatch_originalRenderMethod(...args);
    };

    let ret;
    try {
        ret = await fn();
    } catch (err) {
        res.uncaughtExceptionThrownDuringHandler = true;
        respondToServerErr(err, req, res, 'internalErr');
        return;
    }

    if (!res.wrapGetResponseInTryCatch_calledSend && [200, 304].includes(res.statusCode)) {
        if (req.method.toLowerCase() === 'post') {
            // automatically add this in case the handler forgot to add it. needs to be done.
            res.json({ success: true, ...ret });
        } else {
            respondToServerErr(
                new Error('forgot to call send'),
                req,
                res,
                'internalErrForgotSend'
            );
            return;
        }
    } else {
        return ret;
    }
}

// it's important to catch all errors here, or the entire node process will literally crash
export function runSetTimeoutHandlerAndCatch(tm, fn) {
    const fnWrapped = async () => {
        try {
            await fn();
        } catch (err) {
            logErr(`----- ERR in setAsyncTimeoutAndCatch`);
            logErr(err);
        }
    };
    setTimeout(fnWrapped, tm);
}

// if changing this, change it in public\assets\vanilla\pagelogic.js also
const timeoutMsg = `It looks like your session has timed out`;
