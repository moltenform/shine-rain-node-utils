
import { registerGet } from '../server-utils/api-route-helpers.js';


/*
developed by Ben Fisher(moltenform.com)
Proprietary software
Set up web routes
*/

export class BasicWebRoutes {
    static async Register(app) {
        registerGet(app, '/', async (req, res) => {
            res.redirect('/public/sample-public');
        });
        registerGet(app, '/public/hello-world', async (req, res) => {
            res.send('hello world')
        });
    }
}






