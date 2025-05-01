
export function deleteAllDocuments(conn) {
    conn.sqlSkipOwnerCheck(`delete from EmployeeDocuments`);
}

export function deleteAllEmployees(conn) {
    conn.sqlSkipOwnerCheck(`delete from Employees`);
}

