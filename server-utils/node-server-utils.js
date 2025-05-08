
import { fsExistsSync, fsReadFileAsync, osPlatform } from './file-util-wrappers.js';
import { assertTrue } from './jsutils.js';

/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */


/**
 * Port number that we're running on
 */
export function getPortNumber() {
    return 8999;
}

export function isDebugMode() {
    return true
}

export function isProduction() {
    return process.env.NODE_ENV === 'production';
}


// in case the cwd has changed somehow
export function resetCwd() {
    const pth = getPathOnDisk();
    process.chdir(pth);
}

export function getPathOnDisk() {
    let s = getPathRaw();
    s = s.replace(/\\/g, '/')
    assertTrue(fsExistsSync(s), 'getPathRaw not exist');
    assertTrue(s.split('/').length >= 2, 'why no root');
    const split = s.split('/');
    // asnode/server-utils/node-server-utils.js
    split.pop(); // asnode/server-utils
    split.pop(); // asnode
    const ret = split.join('/');
    assertTrue(fsExistsSync(ret), 'getPath not exist');
    return ret;
}

function getPathRaw() {
    let s = import.meta.url;
    if (s.startsWith('/')) {
        return s;
    } else if (s.startsWith('file:/')) {
        s = s.replace('file:/', '');
        if (osPlatform().startsWith('win')) {
            while (s.startsWith('/') && s[1] !== ':') {
                s = s.replace('/', '');
            }
        } else {
            while (s.startsWith('//')) {
                s = s.replace('//', '/');
            }
        }

        return s;
    } else {
        throw new Error(`could not parse getPath`);
    }
}


export async function internalRedirectToOtherOnGet(path, newP1Param, req, res, readConn, extraData=undefined) {
    if (newP1Param) {
        if (req.params) {
            req.params.p1 = newP1Param
        } else {
            req.params = {p1: newP1Param}
        }
    }

    const newTemplateUrl = getPathOnDisk() + path + '.html'
    assertTrue(fsExistsSync(newTemplateUrl.replace('.html', '.wf.html')))
    const routeJsPath = getPathOnDisk() + path + '.route.js'
    assertTrue(fsExistsSync(routeJsPath))
    const module = await import('file://' + routeJsPath)
    return module.onGet(req, res, readConn, newTemplateUrl, extraData)
}

export async function readJsonFileAsync(target, mustBeUpdatable = false) {
    if (mustBeUpdatable) {
        assertTrue(target.endsWith('.updateable.json'), 'mustBeUpdatable');
    }

    assertTrue(target.endsWith('.json'));
    const text = await fsReadFileAsync(target, 'utf-8');
    let ret;
    try {
        ret = JSON.parse(text);
    } catch (e) {
        throw new Error(`readFile failed ${target} ${e}`);
    }

    return ret;
}
