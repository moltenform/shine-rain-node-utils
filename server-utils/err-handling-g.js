import { isProduction } from './node-server-utils.js';

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
    if (document.referrer && document.referrer.toString().includes('/user/')) {
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
`

export function respondToServerErr(error, req, res, mode, code=500) {
    let ret = {
        msg: 'Unknown error',
        logYouOut: false
    }
    switch(mode) {
        case 'isFromDoubleCheck':
            ret.msg = 'It looks like your username cannot be accessed.'
            ret.logYouOut = true
            break;
        case 'authFail':
            ret.msg = error.toString().includes('expire') ? 
                `${timeoutMsg}. Please log in again.` :
                 "It looks like your username or password is not correct. Please log in again."
            ret.logYouOut = true
            break;
        case 'internalErr':
            // add the error, sometimes user should be able to see it
            if (error.toString().startsWith('Error: ')) {
                ret.msg = error.toString().replace('Error: ', '')
            } else {
                ret.msg = "We're sorry, an error has occurred. " + error.toString()
            }
            
            break;
        case 'internalErrForgotSend':
            ret.msg = "We're sorry, an error has occurred. No page was sent."
            break;
        case '404':
            ret.msg = "We're sorry, the page cannot be found."
            break;
        
        default:
            break;
    }


    logErr(error)
    console.error(error)
    res.respondToServerErrStatusCode = code
    if (req.method?.toLowerCase() === 'get') {
        let sHtml = template
        sHtml = sHtml.replace('%%LOGOUT%%', ret.logYouOut ? 'true' : 'false')
        sHtml = sHtml.replace('%%MSG%%', simpleSanitize(ret.msg))
        if (!isProduction()) {
            sHtml = sHtml.replace('%%DEBUGINFO%%',  simpleSanitize(error.toString()))
        }

        res.status(code).send(sHtml);
    } else {
        res.status(code).send(`{"error": "${ret.msg}"}`);
    }
}

export async function wrapResponseInTryCatch(req, res, fn) {
    if (!res.wrapGetResponseInTryCatch_originalRenderMethod) res.wrapGetResponseInTryCatch_originalRenderMethod = res.render;
    if (!res.wrapGetResponseInTryCatch_originalRedirectMethod) res.wrapGetResponseInTryCatch_originalRedirectMethod = res.redirect;
    if (!res.wrapGetResponseInTryCatch_originalJsonMethod) res.wrapGetResponseInTryCatch_originalJsonMethod = res.json;
    if (!res.wrapGetResponseInTryCatch_originalSendMethod) res.wrapGetResponseInTryCatch_originalSendMethod = res.send;
    if (!res.wrapGetResponseInTryCatch_originalSendFileMethod) res.wrapGetResponseInTryCatch_originalSendFileMethod = res.sendFile;
    res.send = (...args) => {
        res.wrapGetResponseInTryCatch_calledSend = true
        res.wrapGetResponseInTryCatch_originalSendMethod(...args)
    }
    res.sendFile = (...args) => {
        res.wrapGetResponseInTryCatch_calledSend = true
        res.wrapGetResponseInTryCatch_originalSendFileMethod(...args)
    }
    res.json = (...args) => {
        res.wrapGetResponseInTryCatch_calledSend = true
        res.wrapGetResponseInTryCatch_originalJsonMethod(...args)
    }
    res.redirect = (...args) => {
        res.wrapGetResponseInTryCatch_calledSend = true
        res.wrapGetResponseInTryCatch_originalRedirectMethod(...args)
    }
    res.render = (...args) => {
        res.wrapGetResponseInTryCatch_calledSend = true
        res.wrapGetResponseInTryCatch_originalRenderMethod(...args)
    }

    let ret;
    try {
        ret = await fn()
    } catch (err) {
        res.uncaughtExceptionThrownDuringHandler = true
        respondToServerErr(err, req, res, 'internalErr')    
        return
    }
 
    if (!res.wrapGetResponseInTryCatch_calledSend && [200, 304].includes(res.statusCode)) {
        if (req.method.toLowerCase() === 'post') {
            // automatically add this in case the handler forgot to add it. needs to be done.
            res.json({ success: true, ...ret });
        } else {
            respondToServerErr(new Error('forgot to call send'), req, res, 'internalErrForgotSend')
            return
        }
    } else {
        return ret
    }
}


// it's important to catch all errors here, or the node process will crash
export function runSetTimeoutHandlerAndCatch(tm, fn) {
    const fnWrapped = async() => {
        try {
            await fn()
        } catch (err) {
            logErr(`----- ERR in setAsyncTimeoutAndCatch`);
            logErr(err);
        }
    }
    setTimeout(fnWrapped, tm)
}

// if changing this, change it in public\assets\vanilla\pagelogic.js also
const timeoutMsg = `It looks like your session has timed out`;
