const mdsm = require('./mdsm')

mdsm.init({
	port: 9001,				// Listen on port 9001
	url: '/api/',			// All endpoints will be prefixed with /api/
	https: false			// Don't use HTTPS
});

let endpointURL = 'doSomething1';
let allowedClassTypes = [
	mdsm.createClientClass('display');
];
mdsm.addEndpoint({
	url: endpointURL,
	allowedClassTypes: allowedClassTypes
});
