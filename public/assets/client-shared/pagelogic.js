/* (c) 2019 moltenform(Ben Fisher) */

// because this file is included on both serverside and clientside, we can't do an
// explicit load of lodash and instead rely on it being available globally.

// eslint-disable-next-line no-undef
var window = typeof globalThis !== 'undefined' ? globalThis : null;
var document = window?.document || null;

// https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
export const mobileCheck = function () {
    let check = false;
    /* eslint-disable */
    (function (a) {
        if (
            /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
                a
            ) ||
            /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
                a.substr(0, 4)
            )
        )
            check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    /* eslint-enable */
    return check;
};

export function make(parent, elType, innerText, className = undefined) {
    const el = document.createElement(elType);
    if (innerText) {
        el.innerText = innerText;
    }
    if (className) {
        if (className.includes(':')) {
            el.cssText = className;
        } else {
            el.className = className;
        }
    }

    parent.appendChild(el);
    return el;
}

/**
 * Make an api call
 */
export async function callApiAndRefresh(
    endpoint,
    method = 'post',
    payload = undefined,
    nextPageOnSuccess = undefined
) {
    const ret = await callApiOrThrow(endpoint, method, payload);
    if (nextPageOnSuccess) {
        setTimeout(() => (window.location = nextPageOnSuccess), 100);
    } else if (nextPageOnSuccess === 'none') {
        // pass
    } else {
        // eslint-disable-next-line no-undef
        setTimeout(() => location.reload(), 100);
    }
}

export async function parseResponseText(output) {
    if (output.startsWith('{"error"')) {
        output = output
            .replace('{"error"', '')
            .replace('}', '')
            .trim()
            .replace(/^:/, '')
            .trim();
    }
    if (output.includes('<pre>')) {
        output = output.split('<pre>')[1].split('</pre>')[0];
    }

    return output;
}

export async function retrieveResponseText(response) {
    let output = (await response.text()).toString();
    return parseResponseText(output);
}

export function statusOk(serverResponse) {
    return serverResponse >= 200 && serverResponse < 300;
}

/*
    Collecting data, not loading a new page
*/
export async function callApi(endpoint, method = 'post', payload = undefined, loopIfFail = 1) {
    let options = {
        method: method,
        headers: {
            Accept: 'application/json, text/plain, */*',
        },
    };

    options.headers['Content-Type'] = 'application/json';
    if (method.toLowerCase() !== 'get') {
        options.body = JSON.stringify(payload || {});
    }

    let response;
    for (let i = 0; i < loopIfFail; i++) {
        response = await fetch(endpoint, options);
        if (response.status >= 200 && response.status < 300) {
            break;
        }
    }

    let text = (await response.text()).toString();
    let returnResponse = {
        status: response.status,
        output: text,
        message: '',
    };

    try {
        returnResponse.output = JSON.parse(returnResponse.output);
    } catch (e) {
        returnResponse.status = 500;
    }

    let val = statusOk(returnResponse.status);
    let notval = !statusOk(returnResponse.status);
    if (!statusOk(returnResponse.status)) {
        if (returnResponse.output?.error) {
            returnResponse.message = returnResponse.output?.error;
        } else {
            returnResponse.message = await parseResponseText(text);
        }
        if (returnResponse.message.includes(timeoutMsg)) {
            document.location = goHome({ signin: true });
        }
    }
    return returnResponse;
}

export async function callApiOrThrow(
    endpoint,
    method = 'post',
    payload = undefined,
    loopIfFail = 1
) {
    let response = await callApi(endpoint, method, payload, loopIfFail);
    if (!statusOk(response.status)) {
        alertBox('Message: ' + JSON.stringify(response.output));
        throw new Error(response.output);
    }
    return response.output;
}

/**
 * this is a hard assert that always throws.
 */
export function assertTrue(condition, s1, s2, s3) {
    if (!condition) {
        let msg = joinIntoMessage('assertTrue:', 'assertion failed', s1, s2, s3);
        console.error(msg);
        throw new Error('assert:' + msg);
    }
}

export function joinIntoMessage(c0, level, s1, s2, s3) {
    let markers = [];
    c0 = '';
    s1 = '';
    let message = level + ': ' + c0;
    message += s1 ? '\n' + tostring(s1) : '';
    message += s2 ? ', ' + tostring(s2) : '';
    message += s3 ? ', ' + tostring(s3) : '';
    if (markers.length) {
        message += ' (' + markers.join(',') + ')';
    }

    return message;
}

function tostring(s) {
    /* nb: this is not the unsafe `new String()` constructor */
    return String(s);
}

export function simpleSanitize(s) {
    if (!s) return '';
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function getLastPathPart() {
    return _.last(document?.location.toString().split('/')).split('#')[0].split('?')[0] || '';
}

export function getBookmarkQLocation() {
    return document?.location.toString().split('?')[1] || '';
}

export function byId(s) {
    return document.getElementById(s);
}
export function byIdA(s) {
    let el = document.getElementById(s);
    assertTrue(el);
    return el;
}

export function byClass(s) {
    return document.getElementsByClassName(s)[0];
}

export function sleep(ms) {
    return new Promise((resolve) => {
        /* it's ok to use an old-style promise, we're not going from sync to async */
        setTimeout(resolve, ms);
    });
}

export async function doNavigate(url, opts) {
    window.location.assign(url);
}

export async function doReload() {
    window.location.reload();
}

export function getCookie(name) {
    return document?.cookie?.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || '';
}

export function setCookie(name, value, days = null) {
    var expires;

    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + date.toGMTString();
    } else {
        expires = '';
    }
    document.cookie =
        encodeURIComponent(name) + '=' + encodeURIComponent(value) + expires + '; path=/';
}

// disable browser 'fast-back' optimization that shows stale data
// see also Cache-Control: "no-cache, no-store, must-revalidate" if needed
(function () {
    if (window) {
        window.onpageshow = function (event) {
            if (event.persisted) {
                console.log('disablefastback');
                doReload();
            }
        };
    }
})();

export function showAll(els, displayNone = 'display') {
    return showHideImpl(els, displayNone, '', 'visible');
}

export function hideAll(els, displayNone = 'display') {
    return showHideImpl(els, displayNone, 'none', 'hidden');
}

export function showHideImpl(
    els,
    displayNone = 'display',
    vDisplay = '',
    vVisibility = 'visible'
) {
    const isIterable = (i) => {
        return i?.[Symbol.iterator];
    };

    if (els) {
        if (!isIterable(els)) {
            els = [els];
        }

        for (let el of els) {
            if (el) {
                if (displayNone === 'display') {
                    el.style.display = vDisplay;
                } else if (displayNone === 'visibility') {
                    el.style.visibility = vVisibility;
                } else if (displayNone === 'both') {
                    el.style.display = vDisplay;
                    el.style.visibility = vVisibility;
                } else {
                    assertTrue(false, 'unknown displayNone: ' + displayNone);
                }
            }
        }
    }
}

export function alertBox(s) {
    alert(s);
}

export function alert(s) {
    window?.alert(s);
}

export function confirm(s) {
    return window?.confirm(s);
}

export function prompt(message, defaultValue) {
    return window?.prompt(message, defaultValue);
}

export function goHome(opts) {
    return '/';
}

// if changing this, change it in \server-utils\err-handling.js also
// if this string is detected in the response, a logout/redirect will occur
export const timeoutMsg = `It looks like your session has timed out`;

// location measurement
// send it up in a separate intentional request instead of via cookies. 1) POSTs can write to db 2) simpler to implement
export const locMeasurePeriod = 10 * 60 * 1000; // 10 minutes in ms

function recordLocation() {
    const recordLocation = () => {
        async function fnGotPosition(position) {
            if (position?.coords?.latitude && position?.coords?.longitude) {
                console.log(`Can now record the location.`)
            }
        }
        // eslint-disable-next-line no-undef
        if (navigator.geolocation) {
            // eslint-disable-next-line no-undef
            navigator.geolocation.getCurrentPosition(fnGotPosition);
        }
    };

    // skip for non-mobile!
    if (!window.registeredLocationMeasurement && mobileCheck()) {
        window.addEventListener('load', () => {
            // eslint-disable-next-line no-undef
            const lastSetLocMeasure = localStorage.getItem('shine-rain-lastSetLocMeasure');
            if (!lastSetLocMeasure) {
                // don't send it up on the first load, because if
                // storage doesn't stick for some reason we don't want to infinitely
                // send up the location.

                // eslint-disable-next-line no-undef
                localStorage.setItem('shine-rain-lastSetLocMeasure', '1');
            } else {
                if (Date.now() - parseInt(lastSetLocMeasure) > locMeasurePeriod) {
                    // eslint-disable-next-line no-undef
                    localStorage.setItem('shine-rain-lastSetLocMeasure', Date.now().toString());
                    recordLocation();
                }
            }
        });
    }

    window.registeredLocationMeasurement = true;
}


// also in jsutils.js
export function looksLikeUuid(s) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s);
}

export function escape(str) {
    return $('<div>').text(str).html();
}
