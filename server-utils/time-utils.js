import * as serverUtils from './jsutils.js';

/**
 * @param {string} isoString - something like '2022-01-01T12:00:00.000Z'
 *                                              2024-11-26T23:02:05
 * @returns {number} - milliseconds past epoch
 */
export function isoStringToMsPastEpoch(isoString) {
    const d = new Date(isoString);
    return d.getTime();
}

// don't use a raw tolocalestring on the server, who knows where the server is
export function renderMsPastEpoch(companyObj, dt, includeTime = true) {
    const tzString = companyObj.timezone || `en-US:America/Los_Angeles`;
    const locale = tzString.split(':')[0];
    const tz = tzString.split(':')[1];
    return includeTime
        ? dt.toLocaleString(locale, { timeZone: tz })
        : dt.toLocaleDateString(locale, { timeZone: tz });
}

export function renderDateWithDashes(companyObj, date) {
    const numdigits = 1;
    if (typeof date === 'number') {
        date = new Date(date);
    }

    const hardCodePlace = `en-US`; // important: hardcode this one!
    serverUtils.assertTrue(companyObj.timezone, 'no timeZone');
    const tzString = companyObj.timezone || `en-US:America/Los_Angeles`;

    serverUtils.assertTrue(numdigits === 1 || numdigits === 2, 'numdigits must be 1 or 2');
    serverUtils.assertEq(
        2,
        tzString.split(':').length,
        'expected 2 parts to the timezone string'
    );
    let s = date.toLocaleDateString(hardCodePlace, {
        timeZone: tzString.split(':')[1],
        year: 'numeric',
        month: numdigits === 1 ? 'numeric' : '2-digit',
        day: numdigits === 1 ? 'numeric' : '2-digit',
    });
    s = s.replace(/\//g, '-');
    serverUtils.assertTrue(s.split('-').length === 3, 'expected 3 parts to the date');
    let result = s.split('-')[2] + '-' + s.split('-')[0] + '-' + s.split('-')[1];
    dateWithDashesNonTimezoneAware(result); // used to confirm it now has 3 numbers
    return result;
}

export function dateWithDashesToMsTimezoneAware(companyObj, dateString) {
    throw new Error('Not yet implemented');
    // see import getTimezoneOffset from 'get-timezone-offset' on npm,
    // it doesn't quite work though because it doesn't get dst.
    // WE CAN'T JUST DO NEW DATE(YEAR, MONTH, DAY).valueOf because that uses current locale
    // and the server might be in a different timezone.

    // const getTimezoneOffset = () => {};
    // serverUtils.assertEq(5 * 60, getTimezoneOffset('america/new_york'));
    // serverUtils.assertEq(8 * 60, getTimezoneOffset('America/Los_Angeles'));
    // serverUtils.assertEq(-5.5 * 60, getTimezoneOffset('Asia/Kolkata'));
    // // potential logic could look like this, but it doesn't get daylight savings right.
    // let [year, month, day] = dateString.split('-');
    // const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    // const offset = -1 * getTimezoneOffset(companyObj.timezone);
    // const easternTimeOffset = offset * 60 * 1000; // Eastern Time is UTC-5
    // return new Date(Date.UTC(year, month - 1, day)).getTime() + easternTimeOffset;
}

export function dateWithDashesNonTimezoneAware(dateString) {
    serverUtils.assertEq(3, dateString.split('-').length, 'expected 3 parts to the date');
    let [year, month, day] = dateString.split('-');
    year = parseInt(year, 10);
    month = parseInt(month, 10);
    day = parseInt(day, 10);
    serverUtils.assertTrue(
        Number.isFinite(year) && year >= 1970 && year < 2050,
        'Year out of range'
    );
    serverUtils.assertTrue(
        Number.isFinite(month) && year >= 1 && month <= 12,
        'Month out of range'
    );
    serverUtils.assertTrue(Number.isFinite(day) && day >= 1 && day <= 31, 'Day out of range');
    // note that Date.UTC(year, month - 1, day) is not what i want either.
    return new Date(year, month - 1, day);
}

// it's often convenient to have just the date part.
// currently basically the same as renderDateWithDashes, for simplicity...
// in the future we might consider something like 1am being part of the previous day,
// since that might correspond better with what people expect.
export function getJustDatePartTimezoneAdjusted(companyObj, date) {
    return renderDateWithDashes(companyObj, date, 1);
}

export function iterDatesNonTimezoneAware(dateWithDashes1, dateWithDashes2) {
    const start = dateWithDashesNonTimezoneAware(dateWithDashes1);
    const end = dateWithDashesNonTimezoneAware(dateWithDashes2);
    serverUtils.assertTrue(end.valueOf() >= start.valueOf());
    let results = [];
    // if adding 24 * 60 * 60 * 1000 each time i'd worry about leap seconds etc
    for (let day = start; day <= end; day.setDate(day.getDate() + 1)) {
        serverUtils.assertTrue(
            results.length < 9999,
            'too many days in interval (or infinite loop)'
        );
        const copy = new Date(day.valueOf());
        results.push(copy);
    }
    return results;
}

export function iterDatesStringsWithDashes(dateWithDashes1, dateWithDashes2) {
    const arr = iterDatesNonTimezoneAware(dateWithDashes1, dateWithDashes2);
    // if i were to call renderDateWithDashes i'd have to make sure it uses the right timezone
    return arr.map((d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
}

serverUtils.assertEq(
    ['2024-2-9', '2024-2-10', '2024-2-11', '2024-2-12', '2024-2-13', '2024-2-14'],
    iterDatesStringsWithDashes('2024-2-9', '2024-2-14')
);
serverUtils.assertEq(['2024-12-14'], iterDatesStringsWithDashes('2024-12-14', '2024-12-14'));
serverUtils.assertEq(
    ['2024-12-29', '2024-12-30', '2024-12-31', '2025-1-1', '2025-1-2'],
    iterDatesStringsWithDashes('2024-12-29', '2025-1-2')
);

// we can sort them with string comparison if in this format
export function dateStringWithDashesToSortable(s) {
    const { year, month, day } = dateStringWithDashesToNums(s);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function dateStringWithDashesToNums(s) {
    serverUtils.assertEq(3, s.split('-').length, 'expected 3 parts to the date');
    let [year, month, day] = s.split('-');
    year = parseInt(year, 10);
    month = parseInt(month, 10);
    day = parseInt(day, 10);
    return { year, month, day };
}
