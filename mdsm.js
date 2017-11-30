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


	let requestListener = function(req,res){
		processRequest(req,res);
	}

	/* Takes an HTTP request object and returns a list of its cookies */
	function getCookieListFromReq(request) {
		var list = {},
		cookieString = request.headers.cookie;
		cookieString && cookieString.split(';').forEach(function( cookie ) {
			let parts = cookie.split('=');
			list[parts.shift().trim()] = decodeURI(parts.join('='));
		});

		return list;
	}

	/* Takes an encrypted MDSM cookie, decrypts it, and attempts to find a session
	 * in the sessions array with a matching sessionID */
	function findSession(sessionCookie){
		// console.log('Finding session based on this (encrypted) cookie:');
		// console.log('[' + typeof sessionCookie + ']\"' + sessionCookie + '\"');
		// console.log('Which decrypts to:');
		try{
			let unencrypted = decrypt(sessionCookie);
			// console.log('[' + typeof unencrypted + ']\"' +unencrypted);
			let sessionDataObject = JSON.parse(unencrypted);
			// console.log('Session data object: (' + typeof sessionDataObject+ ')');
			// console.log(sessionDataObject);
			for(var i = 0; i < sessions.length; i++){
				if(sessions[i].sessionID === sessionDataObject.sessionID){
					// console.log('Found matching session!');
					// console.log(sessions[i]);
					return sessions[i];
				}
			}
		}
		/* The cookie could not be decrypted.  */
		catch(error){
			console.log('Error finding session from cookie: ');
			console.log(error.stack);
		}

		/* Return null if no matching session could be discerned */
		return null;
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

	let processRequest = function(req,res){
		console.log('================= Parsing new request =====================');
		console.log('Status of sessions array:');
		console.log(sessions);

		console.log('Getting cookie list.');

		/* Get an object containing cookie-value pairs */
		let cookieList = getCookieListFromReq(req);

		console.log('Cookie list: ');
		console.log(cookieList);

		/* If the request already has an MDSM cookie */
		if(cookieList['mdsm']){
			/* Try and get the session associated with the cookie */
			let matchingSession = findSession(cookieList['mdsm']);

			/* If the session is valid */
			if(matchingSession){
				console.log(matchingSession.sessionID);
				let sessID = matchingSession.sessionID;
				res.end('Hello, person from session with session ID ' + sessID);
			}

			/* If the session is invalid, expire it. */
			else {
				res.setHeader('Set-Cookie',[
					`mdsm=; HttpOnly; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
					// `data:59e112e318259d1e5797741c5448971bd108de1f1981a8c048abfedba67a3154=butt; HttpOnly; Max-Age=60`,
					// `data:59e112e318259d1e5797741c5448971bd108de1f1981a8c048abfedba67a3154=butt; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
					]
				);
				res.end('MDSM cookie was valid, but session does not exist. Your bad cookie has been expired.');
			}

		}

		/* If the request does not have an MDSM cookie */
		else {
			let newSessionInfo = {
				sessionID: null,		// Don't specify. Let createSession() generate it.
				timeToLive: 10000,	// 10 second session length
			};
			let newSesh = createSession(newSessionInfo);
			let plainTextCookie = {
				'sessionID' : newSesh.sessionID
			};
			let cookie = encrypt(JSON.stringify(plainTextCookie));
			res.setHeader('Set-Cookie',[
				`mdsm=${cookie};`,
				// `mdsm=${cookie}; HttpOnly; Max-Age=120`,
				// `data:59e112e318259d1e5797741c5448971bd108de1f1981a8c048abfedba67a3154=butt; HttpOnly; Max-Age=60`,
				// `data:59e112e318259d1e5797741c5448971bd108de1f1981a8c048abfedba67a3154=butt; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
				]
			);
			res.end('Hello new person');
		}

		// const ip = res.socket.remoteAddress;
		// const port = res.socket.remotePort;
		// res.end(`Your IP address is ${ip} and your source port is ${port}.`);
	}

	let createSession = function(newSessionInfo){
		// console.log('Creating a new session!');
		/* If a session ID wasn't specified, create a random 32-bit hex-encoded ID */
		if(!(newSessionInfo.sessionID)){
			// console.log('No session ID was specified, so the new session was granted the following ID:');
			newSessionInfo.sessionID = crypto.randomFillSync(Buffer.alloc(32), 0, 32).toString('hex');
			// console.log(newSessionInfo.sessionID);
		};

		/* If no session TTL was specified, default to 0. */
		if(!(newSessionInfo)){
			// console.log('No TTL was specified, so the new session will expire in 0 seconds');
			newSessionInfo.timeToLive = 0;
		}

		/* Create a new session */
		let newSesh = new Session({
			sessionID: newSessionInfo.sessionID,
			expiryDate: Date.now() + newSessionInfo.timeToLive,
		});

		// console.log('New session was successfully created:');
		// console.log(newSesh);
		// console.log('Pushing session to the sessions array.');
		/* Add the session to the sessions array */
		sessions.push(newSesh);
		// console.log('Current state of the sessions array:');
		// console.log(sessions);

		/* Tells the session object to delete itself. If it does, the session truly expired,
		 * so it is deleted from the sessions array. If it does not delete itself, that means
		 * that its expiryDate was extended, so the session has not truly expired yet. In that case,
		 * set a new timeout to attempt to expire the session again at the new expiryDate. */
		function expireSession(session){
			/* Attempt to delete the session object (deletion will only succeed if the session
			 * has truly reached its expiryDate, without being renewed to extend its life) */
			let wasDestroyed = session.attemptSelfDestruct();
			console.log('WasDestroyed: ' + wasDestroyed);
			/* If the session was expired and was successfully deleted, remove it from the sessions array */
			if(wasDestroyed){
				/* Find the index of the session object in the sessions array, and delete it */
				sessions.splice(sessions.indexOf(session,1));	//Delete 1 object at the index of the session
				session = null;	// Set the session object equal to null to ensure the garbage collector catches it
			}

			/* If the session was not deleted, its expiryDate is in the future. Set a new timeout */
			else {
				setTimeout(
					()=>{expireSession(session)},
					session.expiryDate - Date.now()
				);
			}
		}

		/* Set a callback to delete the session at expiry time. Self-destruction is not
		 * guaranteed since (by design), the session may have its expiryDate extended before
		 * the callback is executed. */
		setTimeout(
			()=>{expireSession(newSesh);},		// The function that will expire the session
			newSessionInfo.timeToLive	// To be called after the session's TTL has transpired
		);

		return newSesh;
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

	/* Performs AES-256 encryption on a plaintext using a randomly-generated key */
	function encrypt(plaintext){
		const encipher = crypto.createCipher('aes256', secret);
		let encrypted = encipher.update(plaintext, 'utf8', 'base64');
		encrypted += encipher.final('base64');
		return encrypted;
	}

	/* Decrypts a ciphertext generated by the above encrypt function.
	 * Returns null if the ciphertext is invalid */
	function decrypt(ciphertext){
		// console.log(`Decrypting ciphertext: ${ciphertext}`);
		const decipher = crypto.createDecipher('aes256', secret);
		try{
			let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
			decrypted += decipher.final('utf8');
			// console.log('Decrypted: ' + decrypted);
			return decrypted;
		} catch (error){
			console.log('MDSM Error:\n' + error + error.stack);
			return null;
		}
	}

	return {
		init: init,
		createClientClass: createClientClass,
		addEndpoint: addEndpoint,
		processRequest: processRequest,
	}
}

module.exports = mdsm();
