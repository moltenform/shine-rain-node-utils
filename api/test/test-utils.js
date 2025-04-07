

/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */

import { assertEq, assertTrue, isValidishUuid, modWrapAround, renderPrice } from "../../server-utils/jsutils.js";

export async function testUtils() {
    testIsValidishUuid();
    testRenderPrice();
    testModWrapAround();
}

function testIsValidishUuid() {
    // lengthmatters=true
    assertTrue(isValidishUuid('92f2e126-c521-420e-8433-eec5fee62604'));
    assertTrue(!isValidishUuid('83cc3945-83f2-4965-ae58-7a30e5291c0'));
    assertTrue(
        !isValidishUuid('83cc3945-83f2-4965-ae58-7a30e5291c07a')
    );

    // lengthmatters=false
    assertTrue(
        isValidishUuid('83cc3945-83f2-4965-ae58-7a30e5291c07', false)
    );
    assertTrue(
        isValidishUuid('83cc3945-83f2-4965-ae58-7a30e5291c0', false)
    );
    assertTrue(
        isValidishUuid('83cc3945-83f2-4965-ae58-7a30e5291c07a', false)
    );

    // test characters
    assertTrue(
        !isValidishUuid('83cc3945&83f2-4965-ae58-7a30e5291c07')
    );
    assertTrue(
        !isValidishUuid('83cc3945/83f2-4965-ae58-7a30e5291c07')
    );
    assertTrue(
        !isValidishUuid('83cc3945|83f2-4965-ae58-7a30e5291c07')
    );
    assertTrue(
        !isValidishUuid('83cc3945.83f2-4965-ae58-7a30e5291c07')
    );
    assertTrue(
        !isValidishUuid('83cc3945\n83f2-4965-ae58-7a30e5291c07')
    );
}

function testRenderPrice() {
    assertEq('$0.00', renderPrice(''));
    assertEq('$0.00', renderPrice(null));
    assertEq('$0.00', renderPrice(undefined));
    assertEq('$abc', renderPrice('abc'));
    assertEq('$1.00', renderPrice(1));
    assertEq('$1.20', renderPrice(1.2));
    assertEq('$1.23', renderPrice(1.23));
    assertEq('$1.23', renderPrice(1.234));
    assertEq('$1.23', renderPrice(1.2345));
}

function testModWrapAround() {
    assertEq(0, modWrapAround(0, 3));
    assertEq(1, modWrapAround(1, 3));
    assertEq(2, modWrapAround(2, 3));
    assertEq(0, modWrapAround(3, 3));
    assertEq(2, modWrapAround(-1, 3));
    assertEq(1, modWrapAround(-2, 3));
    assertEq(0, modWrapAround(-3, 3));
}
