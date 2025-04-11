
export async function onGet(req, res, readConn, templateUrl) {
    const state = {}
    const countRows = readConn.getCountAnyOrganizationFromDb('select count(*) as whatToCount from Employees where true')
    const selectedRow = readConn.getFurstRowC('select * from Employees where id="test"') || { counter: 0, info: {counterInJson: 0} };

    let data = { selectedRow: selectedRow };
    res.render(templateUrl, data);
}

export async function onPost(req, res, conn) {
    const existingRow = conn.getFirstRow('select * from Employees where id="test"')
    if (!existingRow && req.body.action !== 'btnBegin') {
        throw new Error('Please press begin test.')
    }

    if (req.body.action === 'btnBegin') {
        conn.replace('Employees', {id: 'testEmployee', firstName: 'bob', lastName: 'smith', counter: 1, info: {counterInJson: 100}})
    } else if (req.body.action === 'btnIncr') {
        conn.update('Employees', {id: 'testEmployee', firstName: 'bob', lastName: 'smith', counter: existingRow.counter+1, info: {counterInJson: 100}})
    } else if (req.body.action === 'btnIncrJson') {
        conn.update('Employees', {id: 'testEmployee', firstName: 'bob', lastName: 'smith', counter: 1, info: {counterInJson: existingRow.counterInJson+1}})
    } else if (req.body.action === 'btnTestRollback') {
        conn.replace('Employees', {id: 'testEmployee', firstName: 'bob--changed', lastName: 'smith--changed', counter: 1, info: {counterInJson: 100}})
        throw new Error('intentional error to test rollback');

    } else {
        throw new Error('unknown action: ' + req.body.action);
    }
}
