import { shouldBreakOnExceptions_Enable, gLog } from '../../server-utils/logging.js';
import { doDocManageTests } from './doc-manage-tests.js';
import { dbTests } from './test-db.js';
import { testUtils } from './test-utils.js';
import { startTestDbMode } from '../businesslogic/schema.js';

/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */

async function runTests() {
    gLog.silent = true;

    process.addListener('exit', () => {
        if (!global.allTestsDone) {
            console.error('ERROR: tests did not complete. uncaught exception?');
            debugger;
        }
    });

    shouldBreakOnExceptions_Enable();
    await startTestDbMode();
    await testAccess();
    await testUtils();
    await doDocManageTests();

    global.allTestsDone = true;
    console.log('all tests done');
    gLog.silent = false;
}

await runTests();
