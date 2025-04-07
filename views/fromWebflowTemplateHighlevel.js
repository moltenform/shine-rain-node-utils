import { fixWholeFile, getRawWebflowHtml, getLocalStrings, getCoreStrings } from './fromWebflowTemplate.js';
import * as serverUtils from '../server-utils/jsutils.js';
import { fsExistsSync } from '../server-utils/file-util-wrappers.js';

export async function fromWebflowTemplate(req, res, data, templateUrl) {
    templateUrl = templateUrl.replace(/\\/g, '/');
    const pts = templateUrl.split('/autoroutes/');
    const routePath = '/' + pts[1].replace('.html', '');
    let toInclude = '';
    let dataStringified = JSON.stringify(data.data || data || {});
    dataStringified = makeSafer(dataStringified);
    toInclude += `<script>globalThis.g_data = ${dataStringified}</script>`;
    let routePathNoSuffix = routePath.replace(/_p[0-9]+$/, '');
    toInclude += `<script type='module' src='${
        '/clientjs' + routePathNoSuffix + '.client.js'
    }'></script>`;

    let templateTech = 'use-njk'
    if (templateTech === 'use-njk') {
        // use njk
        serverUtils.assertTrue(
            fsExistsSync(templateUrl),
            'no fallback html found',
            templateUrl
        );
        res.render(templateUrl, data);
        return false;
    }
}

function makeSafer(dataStringified) {
    dataStringified = dataStringified.replace(/<\/s/g, '???');
    dataStringified = dataStringified.replace(/<s/g, '???');
    dataStringified = dataStringified.replace(/<!--/g, '???');
    dataStringified = dataStringified.replace(/-->/g, '???');
    return dataStringified;
}


if (getFilename(process.argv[1]) == getFilename(import.meta.url)) {
    
}

