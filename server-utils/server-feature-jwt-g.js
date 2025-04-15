
// I recommend 
// https://github.com/bartdorsey/express-jwt-cookies-demo-app
// as a starting point

const jwtHandlingImplemented = false

export function getUserMiddlewareList() {
    if (jwtHandlingImplemented) {
        return [()=>{}]
    } else {
        return []
    }
}

export function getAdminMiddlewareList() {
    if (jwtHandlingImplemented) {
        return [()=>{}]
    } else {
        return []
    }
}

export function jwtHandlingRunOnAppSetup() {

}