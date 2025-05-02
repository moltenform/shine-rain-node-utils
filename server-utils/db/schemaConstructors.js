import { genUuid } from '../jsutils.js';

export function createEmployee(conn, opts) {
    const record = {
        ownerId: opts.ownerId || genUuid(),
        firstName: opts?.firstName,
        lastName: opts?.lastName,
    };

    conn.insertChecked(record.ownerId, 'Employees', record);
    return record;
}

export function createDocument(conn, opts) {
    const record = { id: opts.id || genUuid(), name: opts.name, info: opts.info };
    conn.insertChecked(opts.ownerId, 'EmployeeDocuments', record);
    return record;
}
