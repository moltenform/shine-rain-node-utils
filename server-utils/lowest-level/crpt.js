
import { readJsonFileAsync } from '../lowest-level-utils.js';
import * as serverUtils from '../jsutils.js';
import Cryptr from 'cryptr'
import Crypto from 'crypto';


const _credsOnce = await readJsonFileAsync('./.creds.json');
export const cSecret = _credsOnce._cSecret;
serverUtils.assertTrue(cSecret, 'secret not in json');

export function crptForward(text) {
    const cryptr = new Cryptr(cSecret);
    return cryptr.encrypt(text);
}
export function crptBackward(text) {
    const cryptr = new Cryptr(cSecret);
    return cryptr.decrypt(text);
}
export function crptMatchesExisting(text, existing) {
    const cryptr = new Cryptr(cSecret);
    const expected = cryptr.decrypt(existing)
    return text.length === expected.length && Crypto.timingSafeEqual(Buffer.from(text), Buffer.from(expected));
}


