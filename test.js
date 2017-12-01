const mdsm = require('./mdsm');
const fs = require('fs');

const http = require("http");

// const Session = require("./Classes/Session.js");

// let newSess = new Session("SomeSessionID");

// mdsm.init({
// 	mode: 'Port',
// 	port: 9001,				// Listen on port 9001
// });

mdsm.init({
	mode: 'Middleware',
	endpoints: [
		{
			url: '/api/doSomething1/',
			allowedClassTypes: ['class_A'],
			handler: function(sessionData,clientData,request,response,mdsmCookie){
				console.log('Handling doSomething1');
			}
		},
		{
			url: '/api/doSomething2/',
			allowedClassTypes: ['class_B'],
			handler: function(sessionData,clientData,request,response,mdsmCookie){
				console.log('Handling doSomething2');
			}
		},
	],
});


let processRequest = function(req,res){
	mdsm.processRequest(
		req,res,
		(error)=>{
			console.log(error);

			/* If there was no MDSM cookie in the request */
			if(error.errorCode === 0){
				let newSessionInfo = {
					sessionID: null,		// Don't specify. Let createSession() generate it.
					timeToLive: 10000,	// 10 second session length
				};
				let newSesh = mdsm.createSession(newSessionInfo);

				let clientCookie = mdsm.addClient({
					session: newSesh,
					clientClass: 'class_A',
					clientData: {'foo':'bar'},
				});

				res.setHeader('Set-Cookie',['mdsm=' + clientCookie]);
				res.end('New client detected. You have been granted a cookie.');
				// let clientCookie = newSesh.createClient(newClientInfo);
				// let cookie = encrypt(JSON.stringify(plainTextCookie));
				// res.setHeader('Set-Cookie',[
				// 	`mdsm=${cookie};`,
				// 	// `mdsm=${cookie}; HttpOnly; Max-Age=120`,
				// 	// `data:59e112e318259d1e5797741c5448971bd108de1f1981a8c048abfedba67a3154=butt; HttpOnly; Max-Age=60`,
				// 	// `data:59e112e318259d1e5797741c5448971bd108de1f1981a8c048abfedba67a3154=butt; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
				// 	]
				// );
			}

			else if(error.errorCode === 3){
				res.statusCode = (404);
				res.end('Invalid URL');
			}
		}
	);
}

try{
	let server = http.createServer(processRequest);
	server.listen({
		'port': 9001,
		'host': '0.0.0.0',
	});
	console.log('Client Listening for HTTPS on port 9001');
} catch(error){
	console.log('Error: Failed to initialize HTTP server:');
	console.log(error);
}


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
