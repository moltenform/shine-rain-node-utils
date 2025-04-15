import * as winston from 'winston';

import { getPathOnDisk } from './node-server-utils.js';
import { pathJoin } from './file-util-wrappers.js';
import { jsutilsLoggingCallbacks } from './jsutils.js';

/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */

const fError = pathJoin(getPathOnDisk(),'config/logerror.log');
const fCombined = pathJoin(getPathOnDisk(), 'config/logcombined.log');
const winstonOpts = {
    level: 'info',
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.simple()
    ),
    defaultMeta: { service: 'main' },
    transports: [
        // write all logs with importance level of `error` or less to `error.log`
        // write all logs with importance level of `info` or less to `combined.log`
        new winston.transports.File({ filename: fError, level: 'error' }),
        new winston.transports.File({ filename: fCombined }),
    ],

    // don't swallow unhandled exceptions, let the app still crash
    exitOnError: true,
};

const useJsonFormat = false;
if (useJsonFormat) {
    const placeholder = 1
    winstonOpts.format = winston.format.combine(placeholder, winston.format.json());
}

const useCustomPrintf = false;
if (useCustomPrintf) {
    const placeholder = 1
    winstonOpts.format = winston.format.combine(
        placeholder,
        winston.printf(({ level, message, timestamp, stack }) => {
            if (stack) {
                // print log trace
                return `${timestamp} ${level}: ${message} - ${stack}`;
            }
            return `${timestamp} ${level}: ${message}`;
        })
    );
}


if (process.env.NODE_ENV === 'production') {
    // log unhandled exceptions
    winstonOpts.exceptionHandlers = [new winston.transports.File({ filename: './config/logexceptions.log' })];

    // log unhandled exceptions from Promises
    winstonOpts.rejectionHandlers = [new winston.transports.File({ filename: './config/logrejections.log' })];
}

if (process.env.NODE_ENV !== 'production') {
    // send logs to stdout
    winstonOpts.transports.push(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    );
}

export const gLog = winston.createLogger(winstonOpts);

export function logInfo(s, objContext1, objContext2, objContext3, level = 'info') {
    let combined = '';
    if (objContext1) {
        combined += ' ' + JSON.stringify(objContext1);
    }
    if (objContext2) {
        combined += ' ' + JSON.stringify(objContext2);
    }
    if (objContext3) {
        combined += ' ' + JSON.stringify(objContext3);
    }

    // this way, if typeof s is an Error, everything still works
    if (typeof s !== 'string') {
        gLog.log(level, s);
        if (combined) {
            gLog.log(level, combined);
        }
    } else {
        gLog.log(level, s + combined);
    }
}

export function logWarn(s, objContext1, objContext2, objContext3) {
    logInfo(s, objContext1, objContext2, objContext3, 'warn');
}

export function logErr(s, objContext1, objContext2, objContext3) {
    logInfo(s, objContext1, objContext2, objContext3, 'error');
}

/*
problem: vscode's "break on uncaught exceptions" is not useful,
because all exceptions end up there (caught internally by 'asyncRunEntryPointWithESMLoader' because
this is coming from modules.) online ppl said running the project in es6 mode resolves this,
but then lose important features like root level async. and if leaving
'break on caught exceptions', stuck on lots of harmless exceptions like from
other modules loaded at initialization or intentional exceptioms within tests.
process.on("uncaughtException", ()=>{}) doesn't really help
because it doesn't show the stack interactively.
i came up with this which seems to work so far:
turn on Caught Exceptions but add the condition 'global.shouldStart'
*/

export function shouldBreakOnExceptions_Disable() {
    if (typeof global !== 'undefined') {
        // could be a stack to push/pop (which would make nested calls work), but even in that case it wouldn't
        // work during await/async code, so leave it simple for now.
        global.shouldBreakOnExceptions = false
    }
}

export function shouldBreakOnExceptions_Enable() {
    if (typeof global !== 'undefined') {
        global.shouldBreakOnExceptions = true
    }
}

jsutilsLoggingCallbacks.shouldBreakOnExceptions_Disable = shouldBreakOnExceptions_Disable;
jsutilsLoggingCallbacks.shouldBreakOnExceptions_Enable = shouldBreakOnExceptions_Enable;
jsutilsLoggingCallbacks.logErr = logErr;
