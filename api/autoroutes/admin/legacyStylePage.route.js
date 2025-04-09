
export async function onGet(req, res, readConn, templateUrl) {
    const state = {}
    const countRows = readConn.getCountAnyOrganizationFromDb('select count(*) as whatToCount from users where true')
    const selectedRow = readConn.getFurstRowC('select * from users where id="test"') || { counter: 0, info: {counterInJson: 0} };

    let data = { selectedRow: selectedRow };
    res.render(templateUrl, data);
}

export async function onPost(req, res, conn) {
    if (req.body.action === 'increaseCounter') {
        const selectedRow = conn.getFurstRowC('select * from users where id="test"')
        if (!selectedRow) {
            conn.insertWithoutValidationAnyOrganization('users', { id: 'test', firstName: 'bob', lastName: 'smith', counter: 1, info: {counterInJson: 100}  })
        } else {
            conn.updateAnyOrganization('users', { counter: selectedRow.counter + 1, info: {counterInJson: selectedRow.info.counterInJson + 1} 
            }, { id: 'test' })
        }
    } else if (req.body.action === 'testDatabaseRollback') {
        conn.updateAnyOrganization('users', { counter: 0}, {id: 'test'}, {noChangesOk: true})
        throw new Error('intentional error to test rollback');
    } else {
        throw new Error('unknown action: ' + req.body.action);
    }
}
