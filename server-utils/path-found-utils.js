import prompts from 'prompts';
import hasbin from 'hasbin';
import { fsExistsSync } from './file-util-wrappers.js';

/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */
export async function showWarningIfNotFound(pth, msg, opts) {
    const doesExist = isBinaryFound(pth, opts);
    if (!doesExist) {
        const fullMsg = `${msg} (not found at '${pth}')`;
        if (opts?.ignorable) {
            if (!(await getInputBool(fullMsg + '\n Continue y/n?'))) {
                throw new Error('Stopped due to missing file or folder.' + msg);
            }
        } else {
            if (opts?.showDialog) {
                await promptsAlert(
                    fullMsg +
                        '\n\nThe program will now stop because the file or folder was not found.'
                );
            }

            throw new Error('Stopped due to missing file or folder. ' + msg);
        }
    }
}

export function isBinaryFound(pth, opts) {
    return opts?.checkSystemPath && !pth.includes('/') && !pth.includes('\\')
        ? hasbin.sync(pth)
        : fsExistsSync(pth);
}

export async function getInputBool(msg) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const v = await prompts({
            type: 'text',
            name: 'value',
            message: msg,
        });

        if (v.value?.toLowerCase() === 'y' || v.value?.toLowerCase() === 'yes') {
            return true;
        } else if (v.value?.toLowerCase() === 'n' || v.value?.toLowerCase() === 'no') {
            return false;
        } else {
            console.log('Please enter y or n');
            continue;
        }
    }
}

export async function promptsAlert(msg) {
    await prompts({
        type: 'text',
        name: 'value',
        message: msg + '\nPress enter to continue.',
    });
}
