
const ownerId = 'testEmployeeId'
const docId = 'testDoc'

export async function onGet(req, res, readConn, templateUrl) {
    const state = {}
    const row = readConn.queryFirstRowChecked(ownerId, 'EmployeeDocuments', 'id= ?', docId)
    let data = { row: row || 'Row not yet created.' };
    res.render(templateUrl, data);
}

export async function onPost(req, res, conn) {
    const row = conn.queryFirstRowChecked(ownerId, 'EmployeeDocuments', 'id= ?', docId)
    if (!row) {
        // create the Employees row if it doesn't yet exist
        conn.insertSkipOwnerCheck('Employees', {id: ownerId, firstName: 'bob', lastName: 'smith', })

        // create the EmployeeDocuments row if it doesn't yet exist
        conn.insertChecked(ownerId, 'EmployeeDocuments', {id: docId, counter: 1, info: {counterInJson: 100, otherData: 1}})
    }
    

    if (req.body.action === 'btnBegin') {
        // reset count back to 1
        conn.updateChecked(ownerId, 'EmployeeDocuments', {id: docId, counter: 1, info: {counterInJson: 100, otherData: 1}})
    } else if (req.body.action === 'btnIncr') {
        // add 1 to the field
        conn.updateChecked(ownerId, 'EmployeeDocuments', { counter: row.counter+1}, {id: docId})
    } else if (req.body.action === 'btnIncrJson') {
        // add 1 to the json field
        conn.updateChecked(ownerId, 'EmployeeDocuments', { info: {... row.info, counterInJson: row.info.counterInJson+1} }, {id: docId})
    } else if (req.body.action === 'btnTestRollback') {
        // set it to 9999 -- but this change should get rolled back and not applied
        conn.updateChecked(ownerId, 'EmployeeDocuments', {id: docId, counter: 9999, info: {counterInJson: 9999}})
        throw new Error('intentional error to test rollback');
    } else {
        throw new Error('unknown action: ' + req.body.action);
    }
}
