import * as serverUtils from '../../server-utils/jsutils.js';

/* (c) 2019 moltenform(Ben Fisher) */
/* This file is released under the MIT license */

export async function testUtils() {
    testIsValidishUuid();
    testRenderPrice();
    testModWrapAround();
}

function testIsValidishUuid() {
    // lengthmatters=true
    serverUtils.assertTrue(serverUtils.isValidishUuid('92f2e126-c521-420e-8433-eec5fee62604'));
    serverUtils.assertTrue(!serverUtils.isValidishUuid('83cc3945-83f2-4965-ae58-7a30e5291c0'));
    serverUtils.assertTrue(
        !serverUtils.isValidishUuid('83cc3945-83f2-4965-ae58-7a30e5291c07a')
    );

    // lengthmatters=false
    serverUtils.assertTrue(
        serverUtils.isValidishUuid('83cc3945-83f2-4965-ae58-7a30e5291c07', false)
    );
    serverUtils.assertTrue(
        serverUtils.isValidishUuid('83cc3945-83f2-4965-ae58-7a30e5291c0', false)
    );
    serverUtils.assertTrue(
        serverUtils.isValidishUuid('83cc3945-83f2-4965-ae58-7a30e5291c07a', false)
    );

    // test characters
    serverUtils.assertTrue(
        !serverUtils.isValidishUuid('83cc3945&83f2-4965-ae58-7a30e5291c07')
    );
    serverUtils.assertTrue(
        !serverUtils.isValidishUuid('83cc3945/83f2-4965-ae58-7a30e5291c07')
    );
    serverUtils.assertTrue(
        !serverUtils.isValidishUuid('83cc3945|83f2-4965-ae58-7a30e5291c07')
    );
    serverUtils.assertTrue(
        !serverUtils.isValidishUuid('83cc3945.83f2-4965-ae58-7a30e5291c07')
    );
    serverUtils.assertTrue(
        !serverUtils.isValidishUuid('83cc3945\n83f2-4965-ae58-7a30e5291c07')
    );
}

function testRenderPrice() {
    serverUtils.assertEq('$0.00', serverUtils.renderPrice(''));
    serverUtils.assertEq('$0.00', serverUtils.renderPrice(null));
    serverUtils.assertEq('$0.00', serverUtils.renderPrice(undefined));
    serverUtils.assertEq('$abc', serverUtils.renderPrice('abc'));
    serverUtils.assertEq('$1.00', serverUtils.renderPrice(1));
    serverUtils.assertEq('$1.20', serverUtils.renderPrice(1.2));
    serverUtils.assertEq('$1.23', serverUtils.renderPrice(1.23));
    serverUtils.assertEq('$1.23', serverUtils.renderPrice(1.234));
    serverUtils.assertEq('$1.23', serverUtils.renderPrice(1.2345));
}

function testModWrapAround() {
    serverUtils.assertEq(0, serverUtils.modWrapAround(0, 3));
    serverUtils.assertEq(1, serverUtils.modWrapAround(1, 3));
    serverUtils.assertEq(2, serverUtils.modWrapAround(2, 3));
    serverUtils.assertEq(0, serverUtils.modWrapAround(3, 3));
    serverUtils.assertEq(2, serverUtils.modWrapAround(-1, 3));
    serverUtils.assertEq(1, serverUtils.modWrapAround(-2, 3));
    serverUtils.assertEq(0, serverUtils.modWrapAround(-3, 3));
}
