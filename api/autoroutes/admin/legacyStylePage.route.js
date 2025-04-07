
export async function onGet(req, res, readConn, templateUrl) {
    const state = getCurrentCompanyAndStateOrThrowSq(req, readConn);
   

    let data = { admin: state.admin };
    res.render(templateUrl, data);
}

export async function onPost(req, res, conn) {
    if (req.body.action === 'testDbRollback') {
       
    } else {
        throw new Error('unknown action: ' + req.body.action);
    }
}
