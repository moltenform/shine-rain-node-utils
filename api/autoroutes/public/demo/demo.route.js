import {
    createDocument,
    createEmployee,
} from '../../../../server-utils/db/schemaConstructors.js';
import { deleteAllDocuments, deleteAllEmployees } from '../../../../server-utils/db/schemaDeconstructors.js';
import { genUuid } from '../../../../server-utils/jsutils.js';

const employeeIdToUseForTesting = genUuid();

export async function onGet(req, res, readConn, templateUrl) {
    const state = {};

    // get the first document belonging to employeeIdToUseForTesting
    const row = readConn.queryFirstRowChecked(
        employeeIdToUseForTesting,
        'EmployeeDocuments',
        '(AnyRecord)'
    );
    
    let data = { row: row?.info?.counter || 'Press StartTest to start the test.' };
    res.render(templateUrl, data);
}

export async function onPost(req, res, conn) {
    if (req.body.action === 'StartTest') {
        // set up the test.
        deleteAllDocuments(conn);
        deleteAllEmployees(conn);
        const newEmployee = createEmployee(conn, {ownerId:employeeIdToUseForTesting, firstName: 'Bob', lastName: 'Smith' });
        const newDocument = createDocument(conn, {ownerId:employeeIdToUseForTesting, name:'test.pdf'});
        conn.updateChecked(
            employeeIdToUseForTesting,
            'EmployeeDocuments',
            { info: { counter: 1 } },
            { id: newDocument.id }
        );
    } else if (req.body.action === 'IncrementCounter') {
        // add 1 to the counter.
        const document = conn.queryFirstRowChecked(
            employeeIdToUseForTesting,
            'EmployeeDocuments',
            '(AnyRecord)'
        );
        if (!document) {
            throw new Error('First press StartTest to start the test');
        } else {
            conn.updateChecked(
                employeeIdToUseForTesting,
                'EmployeeDocuments',
                { info: { counter: document.info.counter + 1 } },
                { id: document.id }
            );
        }
    } else if (req.body.action === 'TestRollback') {
        // because of the exception, the changes here should not be applied.
        const document = conn.queryFirstRowChecked(
            employeeIdToUseForTesting,
            'EmployeeDocuments',
            '(AnyRecord)'
        );
        if (!document) {
            throw new Error('First press StartTest to start the test');
        } else {
            conn.updateChecked(
                employeeIdToUseForTesting,
                'EmployeeDocuments',
                { info: { counter: 999 } },
                { id: document.id }
            );
        }

        throw new Error('Intentional error to test rollback');
    } else {
        // unsupported action.
        throw new Error('Unknown action: ' + req.body.action);
    }
}
