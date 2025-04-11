
// I recommend 
// https://github.com/bartdorsey/express-jwt-cookies-demo-app
// as a starting point

const jwtHandlingImplemented = false
function customAuthRequiredMiddleware_Admin() {
}
function customAuthRequiredMiddleware_User() {
}

export function getUserMiddlewareList() {
    if (jwtHandlingImplemented) {
        return [customAuthRequiredMiddleware_User]
    } else {
        return []
    }
}

export function getAdminMiddlewareList() {
    if (jwtHandlingImplemented) {
        return [customAuthRequiredMiddleware_Admin]
    } else {
        return []
    }
}

export function jwtHandlingRunOnAppSetup() {

}