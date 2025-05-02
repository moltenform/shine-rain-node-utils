import { assertEq, assertTrue } from './jsutils.js';

function iterBetweenJsDates(start, end) {
    assertTrue(end.valueOf() >= start.valueOf());
    let results = [];
    // don't add 24 hrs because this might not work for leap seconds etc
    for (let day = start; day <= end; day.setDate(day.getDate() + 1)) {
        assertTrue(
            results.length < 9999,
            'too many days in interval (or infinite loop)'
        );
        const copy = new Date(day.valueOf());
        results.push(copy);
    }

    return results;
}

export function iterBetween8601Dates(start, end) {
    // don't expose these parts because they're not-timezone-aware,
    // wouldn't want them to be generally used.
    const prsd1 = new DateTimeStructure();
    const prsd2 = new DateTimeStructure();
    prsd1.parseDate(start, { requireNoTime: true });
    prsd2.parseDate(end, { requireNoTime: true });
    const jsDate1 = new Date(prsd1.year, prsd1.month - 1, prsd1.day);
    const jsDate2 = new Date(prsd2.year, prsd2.month - 1, prsd2.day);
    return iterBetweenJsDates(jsDate1, jsDate2).map(
        (d) =>
            `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
                .getDate()
                .toString()
                .padStart(2, '0')}`
    );
}

export function date8601Min(s1, s2) {
    assertTrue(s1 || s2);
    if (!s1) {
        return s2;
    } else if (!s2) {
        return s1;
    } else {
        return s1 < s2 ? s1 : s2;
    }
}

export function date8601Max(s1, s2) {
    assertTrue(s1 || s2);
    if (!s1) {
        return s2;
    } else if (!s2) {
        return s1;
    } else {
        return s1 > s2 ? s1 : s2;
    }
}

export function throwIfNotValid8601Date(s, opts = undefined) {
    if (opts?.optional && !s) {
        return;
    }

    const prsd = new DateTimeStructure();
    prsd.parseDate(s, { requireNoTime: true });
}

// this only represents a parsed set of strings.
// it needs an associated timezone for it to represent an actual time.
class DateTimeStructure {
    year;
    month;
    day;
    hour;
    minute;
    second;
    render(opts) {
        assertTrue(!_.isNil(this.year));
        assertTrue(!_.isNil(this.month));
        assertTrue(!_.isNil(this.day));
        assertTrue(!_.isNil(this.hour));
        assertTrue(!_.isNil(this.minute));
        this.second = this.second || 0;
        const padStart = (s, len, c) => s.toString().padStart(len, c);
        let result = `${padStart(this.year, 4, '0')}-${padStart(
            this.month,
            2,
            '0'
        )}-${padStart(this.day, 2, '0')}`;
        if (opts?.requireTime) {
            result += ` ${padStart(this.hour, 2, '0')}:${padStart(
                this.minute,
                2,
                '0'
            )}:${padStart(this.second, 2, '0')}`;
        }
        return result;
    }
    // accept 2025-04-04, 2025/5/6, 2025-04-04 4:36 PM, 2025-04-04 4:36:06 AM
    // whitespace not yet accepted.
    parseDate(s, opts) {
        let dtPart, timePart, isPm;
        s = s.trim();
        if (s.includes(' ')) {
            const spaceParts = s.split(/\s+/);
            assertEq(3, spaceParts.length, 'need 3 parts: date, time, am or pm');
            dtPart = spaceParts[0];
            timePart = spaceParts[1];
            if (spaceParts[2].toLowerCase() === 'pm') {
                isPm = true;
            } else if (spaceParts[2].toLowerCase() === 'am') {
                isPm = false;
            } else {
                throw new Error('expected to end with am or pm');
            }
        } else {
            dtPart = s;
            timePart = '';
        }

        if (opts?.requireTime) {
            assertTrue(timePart, 'need time part');
        } else if (opts?.requireNoTime) {
            assertTrue(!timePart, 'need no time part');
        }

        const firstParts = dtPart.includes('/') ? dtPart.split('/') : dtPart.split('-');
        assertTrue(firstParts.length === 3, 'wrong number of date parts');
        assertTrue(
            firstParts[0].match(/^\d{4}$/),
            'must start with a 4 digit year'
        );
        assertTrue(
            firstParts[1].match(/^\d{1,2}$/),
            'second part should be a 2 digit month'
        );
        assertTrue(
            firstParts[2].match(/^\d{1,2}$/),
            'third part should be a 2 digit day'
        );
        this.year = parseInt(firstParts[0], 10);
        this.month = parseInt(firstParts[1], 10);
        this.day = parseInt(firstParts[2], 10);

        // let's say the day starts at 1am
        this.hour = 1;
        this.minute = 0;
        this.second = 0;
        if (timePart) {
            const timeParts = timePart.split(':');
            assertTrue(
                timeParts.length === 2 || timeParts.length === 3,
                'wrong number of time parts'
            );
            assertTrue(
                timeParts[0].match(/^\d{1,2}$/),
                'first part should be a 2 digit hour'
            );
            assertTrue(
                timeParts[1].match(/^\d{1,2}$/),
                'second part should be a 2 digit minute'
            );
            this.hour = parseInt(timeParts[0], 10);
            this.minute = parseInt(timeParts[1], 10);
            if (timeParts[2]) {
                assertTrue(
                    timeParts[2].match(/^\d{1,2}$/),
                    'second part should be a 2 digit second'
                );
                this.second = parseInt(timeParts[2], 10);
            } else {
                this.second = 0;
            }

            if (isPm) {
                this.hour += 12;
            }
        }
    }
}

export function importLocalTimeString(s, tzString) {
    let dt;
    const oldTz = process.env.TZ;
    try {
        process.env.TZ = tzString;
        dt = new Date(s);
    } finally {
        process.env.TZ = oldTz;
    }
    return dt;
}

console.log(importLocalTimeString('2025-03-07 07:00:00', 'America/Los_Angeles'));
console.log(importLocalTimeString('2025-03-08 07:00:00', 'America/Los_Angeles'));
console.log(importLocalTimeString('2025-03-09 07:00:00', 'America/Los_Angeles'));
console.log(importLocalTimeString('2025-03-10 07:00:00', 'America/Los_Angeles'));
console.log(importLocalTimeString('2025-03-11 07:00:00', 'America/Los_Angeles'));
console.log('a');
