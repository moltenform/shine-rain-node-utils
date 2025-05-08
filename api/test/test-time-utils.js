import { assertEq } from "../../server-utils/jsutils.js";
import { importLocalTimeString, iterBetween8601Dates } from "../../server-utils/time-utils.js";


export async function testTimeUtils() {
    testIterBetween8601Dates()
    testImportLocalTimeString()
}

function testIterBetween8601Dates() {
    assertEq(
        ['2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14'],
        iterBetween8601Dates('2024-02-9', '2024-02-14')
    );
    assertEq(['2024-12-14'], iterBetween8601Dates('2024-12-14', '2024-12-14'));
    assertEq(
        ['2024-12-29', '2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02'],
        iterBetween8601Dates('2024-12-29', '2025-01-02')
    );
    // year with a leap day
    assertEq(
        ['2024-02-28', '2024-02-29', '2024-03-01', '2024-03-02'],
        iterBetween8601Dates('2024-02-28', '2024-03-02')
    );
    // year with no leap day
    assertEq(
        ['2023-02-28', '2023-03-01', '2023-03-02'],
        iterBetween8601Dates('2023-02-28', '2023-03-02')
    );
}

function testImportLocalTimeString() {
    assertEq('Fri Mar 07 2025 15:00:00 GMT+0000 (GMT)', importLocalTimeString('2025-03-07 07:00:00', 'America/Los_Angeles').toString());
    assertEq('Sat Mar 08 2025 15:00:00 GMT+0000 (GMT)', importLocalTimeString('2025-03-08 07:00:00', 'America/Los_Angeles').toString());
    assertEq('Sun Mar 09 2025 14:00:00 GMT+0000 (GMT)', importLocalTimeString('2025-03-09 07:00:00', 'America/Los_Angeles').toString());
    assertEq('Mon Mar 10 2025 14:00:00 GMT+0000 (GMT)', importLocalTimeString('2025-03-10 07:00:00', 'America/Los_Angeles').toString());
    assertEq('Tue Mar 11 2025 14:00:00 GMT+0000 (GMT)', importLocalTimeString('2025-03-11 07:00:00', 'America/Los_Angeles').toString());

}
