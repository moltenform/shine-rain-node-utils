
export function deleteAllDocuments(conn) {
    conn.runSqlSkipOwnerCheck(`delete from EmployeeDocuments where true;`);
}

export function deleteAllEmployees(conn) {
    conn.runSqlSkipOwnerCheck(`delete from Employees where true;`);
}

