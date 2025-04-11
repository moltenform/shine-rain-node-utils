
import * as pageLogic from '/assets/client-shared/pagelogic.js';
 
const btnIds = ["btnBegin", "btnIncr", "btnIncrJson"]
for (let id of btnIds) {
    pageLogic.byId('btn').addEventListener('click', async ()=>{
        await pageLogic.callApiOrThrow(document.location.toString(), 'post',  {action: id})
        document.reload()
    })    
}

pageLogic.byId('btnTestOtherInternalApi').addEventListener('click', async ()=>{
    const results = await pageLogic.callApiOrThrow('/public/example-simple', 'post',  {action: id})
    if (results.value === 123) {
        alert('Got expected value')
    } else {
        alert('Did not get expected value')
    }
})


pageLogic.byId('btnTestRollback').addEventListener('click', async ()=>{
    var gotE
    try {
        await pageLogic.callApiOrThrow(document.location.toString(), 'post',  {action: 'btnTestRollback'})
    } catch (e) {
        gotE = e
    }
    if (gotE) {
        pageLogic.alert("Test failed-expected to see an error.")
    }
    
    document.reload()
})
