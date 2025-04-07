import * as fs from 'fs';
import * as path from 'path';
import fspromises from 'node:fs/promises';
import Os from 'os';

import { promptsAlert } from './pathfoundutils.js';
import * as childProcess from 'child_process';
import { assertTrue } from './jsutils.js';

/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */

export function pathJoin(a, b) {
    return path.join(a, b);
}

export function pathResolve(a) {
    return path.resolve(a);
}

export function pathDirName(a) {
    return path.dirname(a);
}

export function pathBaseName(a) {
    return path.basename(a);
}

export function fsExistsSync(pth) {
    return fs.existsSync(pth);
}

export function osPlatform() {
    return Os.platform();
}

export async function fsCopyFileAsync(src, dest) {
    return fspromises.copyFile(src, dest);
}

export async function fsUnlinkAsyncIfExists(pth) {
    if (fsExistsSync(pth)) {
        return fspromises.unlink(pth);
    }
}

export async function fsReadFileAsync(pth, encoding) {
    assertTrue(typeof encoding === 'string');
    assertTrue(fsExistsSync(pth), 'not exist ', pth);
    return fspromises.readFile(pth, { encoding: encoding });
}

export async function fsWriteFileAsync(pth, s, encoding) {
    assertTrue(typeof encoding === 'string');
    return fspromises.writeFile(pth, s, { encoding: encoding });
}

export async function fsStatAsync(a) {
    return fspromises.stat(a);
}

export async function fsOpenHandleAsync(a, b) {
    return fspromises.open(a, b);
}

export async function fsMkDirAsyncOkIfExists(pth, opts) {
    opts = { ...opts };
    if (!fsExistsSync(pth)) {
        if (opts?.showDialog) {
            await promptsAlert(
                'Creating directory, this might be the first time you are running the server? ' +
                    pth
            );
            delete opts['showDialog'];
        }

        return fspromises.mkdir(pth, opts);
    }
}

export function listFilesInDir(pth, suffix = '') {
    const shorts = fs.readdirSync(pth);
    return shorts
        .map((s) => pathJoin(pth, s))
        .filter((s) => !fs.statSync(s).isDirectory())
        .filter((s) => s.endsWith(suffix));
}

export function listDirsInDir(pth, suffix = '') {
    const shorts = fs.readdirSync(pth);
    return shorts
        .map((s) => pathJoin(pth, s))
        .filter((s) => fs.statSync(s).isDirectory())
        .filter((s) => s.endsWith(suffix));
}

export function listFilesUpToTwoDeep(pth, suffix = '') {
    let results = [];
    results = results.concat(listFilesInDir(pth, suffix));
    for (let subdir of listDirsInDir(pth)) {
        results = results.concat(listFilesInDir(subdir, suffix));
    }
    return results;
}

export async function removeCompanyIndexDir(dir) {
    assertTrue(dir.includes('company-index'));
    if (fsExistsSync(dir)) {
        await fspromises.rm(dir, { recursive: true, force: true });
    }
}

// security-in-depth, have an allow-list for which executables can be run
export const allowedExecutables = ['pdftotext', 'magick'];

function isExecutableAllowed(s) {
    return (
        allowedExecutables.includes(pathBaseName(s)) ||
        allowedExecutables.map((x) => x + '.exe').includes(pathBaseName(s))
    );
}

assertTrue(isExecutableAllowed('pdftotext.exe'));
assertTrue(!isExecutableAllowed('pdftotext1.exe'));

export function runProcessWaitFinishAndGetStandardOut(pathBin, argsToSend) {
    assertTrue(
        isExecutableAllowed(pathBin),
        'not allowed executable, you might need to update the allowedExecutables list'
    );
    return new Promise((resolve, reject) => {
        const bcProcess = childProcess.spawn(pathBin, argsToSend);
        let output = '';
        bcProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        bcProcess.on('close', (code) => {
            if (code === 0) {
                resolve(output.trim()); // exited normally
            } else {
                reject(new Error(`exited with code ${code} and output ${output}`));
            }
        });

        bcProcess.on('error', (err) => {
            reject(err);
        });
    });
}
