const http = require("http");
const https = require("https");
const crypto = require('crypto');

const ClientClass = require("./Classes/ClientClass.js");
const Session = require("./Classes/Session.js");

let mdsm = function(){
	var port;		// Server will listen to requests to this port

	/* For crypto services */
	const secret = crypto.randomFillSync(Buffer.alloc(256), 0, 256).toString('base64');

	let sessions = [];			// Will be populated with sessions as they are initialized
	let endpoints = [];			// Will contain a list of valid endpoints
	let clientClasses = [];		// Will contain a list of valid client classes

	function findSession(sessionCookie){
		// let unencrypted = decrypt(sessionCookie.mdsm);
		return sessionCookie;
	}

	sessions.push(new Session('Session 1'));
	let requestListener = function(req,res){
		// let session = findSession((req.headers.cookie));
		// console.log(req.headers.cookie);

		let cookieList = parseCookies(req);
		console.log(cookieList);
		const ip = res.socket.remoteAddress;
  		const port = res.socket.remotePort;

		//let testSession = new Session('1234');
		let cookie = encrypt('Super secret stuff');
		res.setHeader('Set-Cookie',[
			`mdsm=${cookie};`,
			`data:59e112e318259d1e5797741c5448971bd108de1f1981a8c048abfedba67a3154=butt;`,
			// `data:59e112e318259d1e5797741c5448971bd108de1f1981a8c048abfedba67a3154=butt; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
			]
		);

  		res.end(`Your IP address is ${ip} and your source port is ${port}.`);

	}

	function parseCookies (request) {
		var list = {},
		rc = request.headers.cookie;

		rc && rc.split(';').forEach(function( cookie ) {
			var parts = cookie.split('=');
			list[parts.shift().trim()] = decodeURI(parts.join('='));
		});

		return list;
	}

	/* Initializes an instance based on the given configuration. See documentation for "config" schema */
	let init = function(config){
		port = config.port;
		if(config.https){
			let server = https.createServer({
				'key': config.https.key,
				'cert': config.https.cert,
				'passphrase': config.https.passphrase,
				'ca': config.https.ca
			},requestListener);
			server.listen({
				'port': port,
				'host': '0.0.0.0',
			});

		} else {
			let server = http.createServer(requestListener);
			server.listen({
				'port': port,
				'host': '0.0.0.0',
			});
			console.log('MDSM Listening on port ' + port);
		}
	}

	let createClientClass = function(clientClassID){
		let newClientClass = new ClientClass(clientClassID);
		return newClientClass;
	}

	/* Create a new endpoint */
	let addEndpoint = function(newEndpointInfo){
		console.log(`Adding new endpoint:`);
		console.log(newEndpointInfo);
		/* Trim the URL to ensure uniformity, then add it to the endpoints list. */
		endpoints.push('/' + trimURL(newEndpointInfo.url) + '/');

		/* If the client class doesn't exist, create it and add it to the list. */
		if(!(clientClasses.includes(newEndpointInfo.allowedClassTypes))){
			clientClasses.push(newEndpointInfo.allowedClassTypes);
		}
	}

	let processRequest = function(req){

	}

	/* If the URL starts or begins with slashes, trims it to remove them. */
	function trimURL(url){
		let trimmedUrl = url;
		if(url.charAt(0) === '/'){
			trimmedUrl = url.substring(1);
		}
		if(url.charAt(url.length - 1) === '/'){
			trimmedUrl = url.substring(0,url.length - 1);
		}
		return trimmedUrl;
	}

	function encrypt(plaintext){
		const encipher = crypto.createCipher('aes256', secret);
		let encrypted = encipher.update(plaintext, 'utf8', 'base64');
		encrypted += encipher.final('base64');
		return encrypted;
	}

	function decrypt(encryptedData){
		const decipher = crypto.createDecipher('aes256', secret);
		let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
		decrypted += decipher.final('utf8');
		return decrypted;
	}

	return {
		init: init,
		createClientClass: createClientClass,
		addEndpoint: addEndpoint,
		processRequest: processRequest,
	}
}

module.exports = mdsm();
