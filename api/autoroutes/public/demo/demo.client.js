import * as pageLogic from '/assets/client-shared/pagelogic.js';

pageLogic.byId('StartTest').addEventListener('click', async () => {
    await pageLogic.callApiOrThrow(document.location.toString(), 'post', {
        action: 'StartTest',
    });
    document.reload();
});

pageLogic.byId('IncrementCounter').addEventListener('click', async () => {
    await pageLogic.callApiOrThrow(document.location.toString(), 'post', {
        action: 'IncrementCounter',
    });
    document.reload();
});

pageLogic.byId('TestRollback').addEventListener('click', async () => {
    var gotE;
    try {
        await pageLogic.callApiOrThrow(document.location.toString(), 'post', {
            action: 'TestRollback',
        });
    } catch (e) {
        gotE = e;
    }
    if (gotE) {
        pageLogic.alert('Test failed-expected to see an error.');
    }

    document.reload();
});
