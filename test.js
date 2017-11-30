const mdsm = require('./mdsm');
const fs = require('fs');

// const Session = require("./Classes/Session.js");

// let newSess = new Session("SomeSessionID");

mdsm.init({
	port: 9001,				// Listen on port 9001
});

// mdsm.init({
// 	port: 9001,				// Listen on port 9001
// 	https: {
// 		key: fs.readFileSync('./test_data/key.pem'),
// 		cert: fs.readFileSync('./test_data/cert.pem'),
// 		passphrase: 'password'
// 	}
// });

// let endpointURL = 'doSomething1';
// let allowedClassTypes = [
// 	mdsm.createClientClass('display')
// ];
//
// mdsm.addEndpoint({
// 	url: endpointURL,
// 	allowedClassTypes: allowedClassTypes
// });
