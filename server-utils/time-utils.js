
// represents a parsed set of strings.

import { assertTrue } from "./jsutils.js"

// needs timezone info for it to represent an actual time.
export class DateTimeStructure {
    year
    month
    day
    hour
    minute 
    second
    render() {
        assertTrue(!_.isNil(this.year))
        assertTrue(!_.isNil(this.month))
        assertTrue(!_.isNil(this.day))
        assertTrue(!_.isNil(this.hour))
        assertTrue(!_.isNil(this.minute))
        this.second = this.second || 0
        return `${padStart(this.year, 4, '0')}-${padStart(this.month, 2, '0')}-${padStart(this.day, 2, '0')} ` + 
        `${padStart(this.hour, 2, '0')}:${padStart(this.minute, 2, '0')}:${padStart(this.second, 2, '0')}`
    }
    // accept 2025-04-04, 2025/5/6, 2025-04-04 4:36 PM, 2025-04-04 4:36:06 AM
    // whitespace not yet accepted.
    parseDate(s) {
        let dtPart, timePart
        if (s.includes(' ')) {
            [dtPart, timePart] = s.split(/\s+/);
        } else {
            dtPart = s
            timePart = ''
        }

        const firstParts = dtPart.includes('/') ? dtPart.split('/') : dtPart.split('-');
        assertTrue(firstParts.length === 3, 'wrong number of date parts');
        assertTrue(firstParts[0].match(/^\d{4}$/), 'must start with a 4 digit year');
        assertTrue(firstParts[1].match(/^\d{1,2}$/), 'second part should be a 2 digit month');
        assertTrue(firstParts[2].match(/^\d{1,2}$/), 'third part should be a 2 digit day');
        this.year = parseInt(firstParts[0], 10)
        this.month = parseInt(firstParts[1], 10)
        this.day = parseInt(firstParts[2], 10)
        // let's say the day starts at 1am
        this.hour = 1
        this.minute = 0
        this.second = 0
        if (timePart) {
            const timeParts = timePart.split(':');
            assertTrue(timeParts.length === 2 || timeParts.length === 3, 'wrong number of time parts');
            assertTrue(timeParts[0].match(/^\d{1,2}$/), 'first part should be a 2 digit hour');
            assertTrue(timeParts[1].match(/^\d{1,2}$/), 'second part should be a 2 digit minute');
            this.hour = parseInt(timeParts[0], 10)
            this.minute = parseInt(timeParts[1], 10)
            if (timeParts[2]) {
                assertTrue(timeParts[2].match(/^\d{1,2}$/), 'second part should be a 2 digit second');
                this.second = parseInt(timeParts[2], 10)
            } else {
                this.second = 0
            }
        }
    }
}

export function importLocalTimeString(s, tzString) {
    let dt
    const oldTz = process.env.TZ
    try {
        process.env.TZ = tzString
        dt = new Date(s)
    } finally {
        process.env.TZ = oldTz
    }
    return dt
}

console.log(importLocalTime('2025-03-07 07:00:00', 'America/Los_Angeles'))
console.log(importLocalTime('2025-03-08 07:00:00', 'America/Los_Angeles'))
console.log(importLocalTime('2025-03-09 07:00:00', 'America/Los_Angeles'))
console.log(importLocalTime('2025-03-10 07:00:00', 'America/Los_Angeles'))
console.log(importLocalTime('2025-03-11 07:00:00', 'America/Los_Angeles'))
console.log('a')

