
export async function onGet(req, res, readConn, templateUrl) {
    const state = {}
    const countRows = readConn.getCountAnyCompanyFromDb('select count(*) as whatToCount from users where true')
    const selectedRow = readConn.getFurstRowC('select * from users where id="test"')

    let data = { admin: state.admin };
    res.render(templateUrl, data);
}

export async function onPost(req, res, conn) {
    if (req.body.action === 'increaseCounter') {
        const selectedRow = conn.getFurstRowC('select * from users where id="test"')
        if (!selectedRow) {
            conn.insertWithoutValidationC('users', { id: 'test', firstName: 'bob', lastName: 'smith', counter: 1,  })
        } else {
            conn.updateAnyCompany('users', { counter: selectedRow.counter + 1 }, { id: 'test' })
        }
    }  else if (req.body.action === 'jsonDemo') {
        const selectedRow = conn.getFurstRowC('select * from users where id="test"')
        if (!selectedRow) {
            conn.insertWithoutValidationC('users', { id: 'test', firstName: 'bob', lastName: 'smith', counter: 1,  })
        }

        if (!selectedRow.info) {
            conn.insertWithoutValidationC('users', { id: 'test', firstName: 'bob', lastName: 'smith', counter: 1,  })
        } else {
            conn.updateAnyCompany('users', { counter: selectedRow.counter + 1 }, { id: 'test' })
        }
    } else {
        throw new Error('unknown action: ' + req.body.action);
    }
}
