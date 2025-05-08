
export async function onGet(req, res, readConn, templateUrl) {
    let data = { abc: '"hello world"' };
    res.render(templateUrl, data);
}

