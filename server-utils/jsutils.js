import { v4 as uuidv4 } from 'uuid';

import _ from 'lodash';
import {
    logErr,
    shouldBreakOnExceptions_Disable,
    shouldBreakOnExceptions_Enable,
} from './logging.js';

/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */

export function genUuid() {
    return uuidv4();
}

function consoleError(s) {
    logErr(s);
}

export function assertThrow(fn, expectErrContains, s1, s2) {
    shouldBreakOnExceptions_Disable();
    let didThrow = undefined;
    try {
        fn();
    } catch (e) {
        didThrow = e;
    } finally {
        shouldBreakOnExceptions_Enable();
    }

    if (!didThrow) {
        let msg = joinIntoMessage('assertThrow:', s1, s2);
        throw new Error('assertThrow: did not throw: ' + msg);
    }

    if (expectErrContains) {
        assertTrue(
            didThrow.toString().includes(expectErrContains),
            `err string '${didThrow.toString()}' must include '${expectErrContains}'`,
            s1,
            s2
        );
    }
}

export async function assertThrowAsync(fn, expectErrContains, s1, s2) {
    let didThrow = undefined;
    shouldBreakOnExceptions_Disable();
    try {
        await fn();
    } catch (e) {
        didThrow = e;
    } finally {
        shouldBreakOnExceptions_Enable();
    }

    if (!didThrow) {
        let msg = joinIntoMessage('assertThrow:', s1, s2);
        throw new Error('assertThrow: did not throw: ' + msg);
    }

    if (expectErrContains) {
        assertTrue(
            didThrow.toString().includes(expectErrContains),
            `err string '${didThrow.toString()}' must include '${expectErrContains}'`,
            s1,
            s2
        );
    }
}

export function assertWarn(condition, s1, s2, s3) {
    if (!condition) {
        let msg = joinIntoMessage('assertWarn:', '_', s1, s2, s3);
        consoleError(msg);
    }
}

export async function logContextOnFailureButLetExceptionContinue(context, contextParams, fn) {
    let succeeded = false;
    let ret;
    try {
        ret = await fn();
        succeeded = true;
    } finally {
        if (!succeeded) {
            logErr(`${context}`, contextParams);
        }
    }

    return ret;
}

const silenceAssertMsgs = false;

/**
 * this is a hard assert that always throws.
 */
export function assertTrue(condition, s1, s2, s3) {
    if (!condition) {
        let msg = joinIntoMessage('assertTrue:', '_', s1, s2, s3);
        if (!silenceAssertMsgs) {
            consoleError(msg);
        }

        throw new Error('assertTrue: ' + msg);
    }
}

/**
 * deep equality.
 */
export function assertEq(expected, got, s1, s2, s3) {
    if (!_.isEqual(expected, got)) {
        let msg = joinIntoMessage(
            'assertEq:',
            `${JSON.stringify(expected)} does not equal ${JSON.stringify(got)}`,
            s1,
            s2,
            s3
        );
        if (!silenceAssertMsgs) {
            consoleError(msg);
        }

        throw new Error('assertEq: ' + msg);
    }
}

/**
 * for checking arguments
 */
export function assertArgs(condition, s1, s2, s3) {
    if (!condition) {
        let msg = joinIntoMessage('assertArgs:', '_', s1, s2, s3);
        if (!silenceAssertMsgs) {
            consoleError(msg);
        }

        throw new Error(
            'One or more arguments is missing. Did you leave a field empty? (assertArgs) ' +
                msg
        );
    }
}

export function simpleSanitize(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function checkNan(obj) {
    for (let k in obj) {
        if (
            typeof obj[k] !== 'string' &&
            typeof obj[k] !== 'object' &&
            !Number.isFinite(obj[k])
        ) {
            consoleError(`${k} is NaN or not finite ${JSON.stringify(obj)}`);
            throw new Error('checkNaN');
        }
    }
}

/**
 * combine strings, and move all 'markers' to the end
 */
export function joinIntoMessage(c0, level, s1, s2, s3) {
    let markers = [];
    c0 = findMarkers(c0, markers) ?? '';
    s1 = findMarkers(s1, markers);
    let message = level + ': ' + c0;
    message += s1 ? '\n ' + tostring(s1) : '';
    message += s2 ? ', ' + tostring(s2) : '';
    message += s3 ? ', ' + tostring(s3) : '';
    if (markers.length) {
        message += ' (' + markers.join(',') + ')';
    }

    return message;
}

/**
 * we add two-digit markers to most asserts, so that if a bug report comes in,
 * we have more context about the site of failure.
 * assert markers are in the form xx|; this fn extracts them from a string.
 */
function findMarkers(s, markers) {
    if (s && typeof s === 'string' && s[2] === '|') {
        markers.push(s.slice(0, 2));
        return s.slice(3);
    } else if (!s) {
        return undefined;
    } else {
        return tostring(s);
    }
}

function tostring(s) {
    /* nb: this is not the unsafe `new String()` constructor */
    return String(s);
}

export function genRandomId() {
    const ret = genUuid().slice(19);
    assertTrue(ret.length > 5);
    return ret;
}

export function renderPrice(n) {
    if (!n) {
        return '$0.00';
    } else if (!Number.isFinite(n)) {
        return '$' + n.toString();
    } else {
        return '$' + n.toFixed(2);
    }
}

export function modWrapAround(a, b) {
    let ret = a % b;
    if (ret < 0) {
        ret += b;
    }
    return ret;
}

export function sleep(ms) {
    return new Promise((resolve) => {
        /* it's ok to use an old-style promise, we're not going from sync to async */
        setTimeout(resolve, ms);
    });
}

export function isValidishUuid(s, lengthMatters = true) {
    if (lengthMatters) {
        if (s.length !== genUuid().length) {
            return false;
        }
    } else {
        if (s.length < 2) {
            return false;
        }
    }
    if (!s.match(/^[0-9a-zA-Z{} _-]+$/)) {
        return false;
    }
    return true;
}

export function needMinimumPurchaseOf50Cents() {
    return false;
}

export function simpleIsValidEmail(s) {
    return !!/^\S+@\S+\.\S+$/.test(s);
}

// also in pagelogic.js
export function looksLikeUuid(s) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s);
}
