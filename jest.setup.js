const fetch = require('node-fetch');
// Make node-fetch available as a global, mimicking the browser environment
global.fetch = fetch;
global.Response = fetch.Response;
