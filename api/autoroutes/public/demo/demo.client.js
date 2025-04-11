
import * as pageLogic from '/assets/client-shared/pagelogic.js';
 
const btnIds = ["btnBegin", "btnIncr", "btnIncrJson"]
for (let id of btnIds) {
    pageLogic.byId('btn').addEventListener('click', async ()=>{
        await pageLogic.callApiOrThrow(document.location.toString(), 'post',  {action: id})
        document.reload()
    })    
}

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

