import {
    registerGet,
    registerGetUsingDb,
    registerPost,
    registerPostUsingDb,
} from '../server-utils/api-route-helpers.js';
import { getPathOnDisk } from '../server-utils/node-server-utils.js';
import {
    fsExistsSync,
    listDirsInDir,
    listFilesInDir,
    listFilesRecurse,
} from '../server-utils/file-util-wrappers.js';
import { assertEq, assertTrue } from '../server-utils/jsutils.js';
import { fromWebflowTemplate } from '../views/fromWebflowTemplateHighlevel.js';
import _ from 'lodash';


export class ApiRoutesAutoRoutes {
    static async Register(app) {
        const pth = getPathOnDisk();
        await registerAutoRoutesImpl(app, `${pth}/api/autoroutes/admin`);
        await registerAutoRoutesImpl(app, `${pth}/api/autoroutes/public`);
        await registerAutoRoutesImpl(app, `${pth}/api/autoroutes/user`);
        await registerAutoRoutesClientJs(app, `${pth}/api/autoroutes/admin`);
        await registerAutoRoutesClientJs(app, `${pth}/api/autoroutes/public`);
        await registerAutoRoutesClientJs(app, `${pth}/api/autoroutes/user`);
    }
}

// map all .client.js files to be static files
// note: no authorization is needed for these, even if they are in /admin or /user
async function registerAutoRoutesClientJs(app, pth) {
    const found = await listFilesRecurse(pth, '.client.js');
    for (let jsPth of found) {
        const url = getUrlFromPath(jsPth.replace(/\\/g, '/'), '.client.js');
        const route = `/clientjs` + url + '.client.js';
        app.get(route, async (req, res) => {
            // these act like static assets, no authentication needed
            // authentication hits the db so save it for when it's needed
            res.sendFile(jsPth);
        });
    }
}

async function registerAutoRoutesImpl(app, pth) {
    const found = await listFilesRecurse(pth, '.route.js');

    // preemptively load them. 1) better for security 2) catch any syntax errors sooner
    for (let jsPth of found) {
        const module = await import('file://' + jsPth)
        const url = getUrlFromPath(jsPth.replace(/\\/g, '/'),'.route.js')
        const urlWithParams = getUrlFromPathWithParams(url, jsPth.replace(/\\/g, '/'))
        if (module.onPost) {
            registerPostUsingDb(app, urlWithParams, async (req, res, conn) => {
                return await module.onPost(req, res, conn);
            });
        }

        const templateUrl = jsPth.replace('.route.js', '.html');
        if (module.onGet) {
            registerGetUsingDb(app, urlWithParams, async (req, res, conn) => {
                // don't check for templateUrl existance yet, could be an internal redirect.
                // assertTrue(fsExistsSync(templateUrl) || fsExistsSync(templateUrl.replace('.html', '.wf.html')), 'templatenotfound', templateUrl)
                await module.onGet(req, res, conn, templateUrl);
            });
        } else {
            // generate automatic onGet handler
            registerGet(app, urlWithParams, async (req, res) => {
                let data = {};
                await fromWebflowTemplate(req, res, data, templateUrl);
            });
        }
    }
}

function getUrlFromPath(s, suffix) {
    assertTrue(s.endsWith(suffix));
    s = s.replace(suffix, '');

    let pts = s.split('/autoroutes/');
    assertEq(2, pts.length, s);
    s = '/' + pts[1];

    pts = s.split('/');
    let lastPt = _.last(pts);
    // remove m prefix (no functionality, just to help organize the files)
    lastPt = lastPt.replace(/^m[0-9]+_/, '');

    // remove p suffix (indicates parameters are passed in)
    lastPt = lastPt.replace(/_p[0-9]+$/, '');
    pts[pts.length - 1] = lastPt;
    return pts.join('/');
}

function getUrlFromPathWithParams(url, pth) {
    if (pth.includes('_p1.route.js')) {
        return url + '/:p1';
    } else if (pth.includes('_p2.route.js')) {
        return url + '/:p1/:p2';
    } else if (pth.includes('_p3.route.js')) {
        return url + '/:p1/:p2/:p3';
    } else {
        return url;
    }
}

assertEq('/a1/b1', getUrlFromPath('/path/to/autoroutes/a1/b1.route.js', '.route.js'));
assertEq('/a1/b1', getUrlFromPath('/path/to/autoroutes/a1/m9_b1.route.js', '.route.js'));
assertEq('/a1/b1', getUrlFromPath('/path/to/autoroutes/a1/m99_b1.route.js', '.route.js'));
assertEq('/a1/b1', getUrlFromPath('/path/to/autoroutes/a1/b1_p1.route.js', '.route.js'));
assertEq('/a1/b1', getUrlFromPath('/path/to/autoroutes/a1/b1_p2.route.js', '.route.js'));
assertEq('/a1/b1', getUrlFromPath('/path/to/autoroutes/a1/m99_b1_p99.route.js', '.route.js'));
