const http = require("http");
const https = require("https");
const crypto = require('crypto');

const Session = require("./Classes/Session.js");

let mdsm = function(){
	let MDSM_CONFIG = {
		mode: null,	// Valid values: {'Port','Middleware'}
		port: null,	// If on port mode, the port number being listened on. Otherwise null.

		/* For crypto services */
		secret: crypto.randomFillSync(Buffer.alloc(256), 0, 256).toString('base64'),
	};

	let sessions = [];			// Will be populated with sessions as they are initialized
	let endpoints = [];			// Will contain a list of valid endpoints

	/* Initializes an instance of MDSM in either 'Port' mode (which listens for requests
	 * on a specified port) or "Middleware" mode, which allows the processRequest function
	 * to be  */
	let init = function(initConfig){
		if(initConfig.mode === 'Port'){
			MDSM_CONFIG.mode = 'Port';			// Declare the mode to 'Port'
			MDSM_CONFIG.port = initConfig.port;	// Define the port number
			listen(initConfig);					// Initialize an HTTP/S server
		}

		else if(initConfig.mode === 'Middleware'){
			MDSM_CONFIG.mode = 'Middleware';			// Declare the mode to 'Port'
		}

		/* Save the list of valid endpoint-allowedClassType-handler objects, but first trims
		 * the url so that it's uniform */
		endpoints = initConfig.endpoints.map((endpoint)=>{
			endpoint.url = trimURL(endpoint.url);
			return endpoint;
		});
	}

	let requestListener = function(req,res,next){
		processRequest(req,res,next);
	}

	/* Listens for requests on a specified port. See documentation for "config" schema */
	let listen = function(config){
		/* If HTTPS settings were specified, configure an HTTPS server. */
		if(config.https){
			/* Use the key, certificate, and (optional) passphrase and ca fields passed in */
			try{
				let server = https.createServer({
					'key': config.https.key,
					'cert': config.https.cert,
					'passphrase': config.https.passphrase,
					'ca': config.https.ca
				},requestListener);
				server.listen({
					'port': MDSM_CONFIG.port,
					'host': '0.0.0.0',
				});
				console.log('MDSM Listening for HTTPS on port ' + MDSM_CONFIG.port);
			} catch(error){
				console.log('MDSM error: Failed to initialize HTTPS server. Double check the configurations.');
				console.log(error.stack);
			}
		}
		/* If no HTTPS settings were specified, default to an HTTP server. */
		else {
			try{
				let server = http.createServer(requestListener);
				server.listen({
					'port': MDSM_CONFIG.port,
					'host': '0.0.0.0',
				});
				console.log('MDSM Listening for HTTP on port ' + MDSM_CONFIG.port);
			} catch(error){
				console.log('MDSM error: Failed to initialize HTTP server');
			}
		}
	}

	let processRequestAsMiddleware = function(req,res,next){
		if(MDSM_CONFIG.mode != 'Middleware'){
			next({
				errorCode: 2,	// Error code 2: Invalid MDSM cookie
				errorText: 'MDSM Error: processRequest() unavailable in Port mode.\
				 				Use Middleware mode, or route requests directly to the \
								port specified on initialization.',
			});
		} else {
			processRequest(req,res,next);
		}
	}
	/* Process an incoming request. This function may be called by the request listener,
	 * if listening on a port, or manually through the external API. */
	let processRequest = function(req,res,next){
		// console.log('================= Parsing new request =====================');
		// console.log('Status of sessions array:');
		// console.log(sessions);

		let reqUrl = trimURL(req.url);	//Get a trimmed version of the URL
		// console.log('Processing request to ' + trimURL(req.url));

		/* check whether the request was for a valid endpoint URL. If it wasn't, call the
		 * error callback.*/
		if(!(isValidEndpoint(reqUrl))){
			next({
				errorCode: 3,	// Error code 3: Invalid endpoint URL
				errorText: 'Invalid endpoint'
			});
		}
		/* If the request was for a valid URL, continue processing the request */
		else {
			// console.log('Getting cookie list.');

			/* Get an object containing cookie-value pairs */
			let cookieList = getCookieListFromReq(req);

			// console.log('Cookie list: ');
			// console.log(cookieList);

			/* If the request has an MDSM cookie */
			if(cookieList['mdsm']){
				/* Try and get the session associated with the cookie */
				let match = findSession(cookieList['mdsm']);

				/* If the session is valid, pass it to the session and let if figure out what to do.*/
				if(match){
					// console.log(matchingSession.sessionID);
					// let sessID = matchingSession.sessionID;
					// res.end('Hello, person from session with session ID ' + sessID);
					match.session.processRequest(req,res,match.mdsmCookie,next);
				}

				/* If the session is invalid, expire the bad cookie and pass an error to the caller through the next() callback */
				else {
					next({
						errorCode: 1,	// Error code 1: Invalid MDSM cookie
						errorText: 'MDSM Error: Invalid MDSM cookie',
					});
					res.setHeader('Set-Cookie',[
						`mdsm=; HttpOnly; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
						// `data:59e112e318259d1e5797741c5448971bd108de1f1981a8c048abfedba67a3154=butt; HttpOnly; Max-Age=60`,
						// `data:59e112e318259d1e5797741c5448971bd108de1f1981a8c048abfedba67a3154=butt; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
						]
					);
					res.end('MDSM cookie was valid, but session does not exist. Your bad cookie has been expired.');
				}
			}

			/* If the request does not have an MDSM cookie, ignore it and let the caller figure out what to do next.*/
			else {
				/* If on port mode, send an HTTP 400 response */
				if(MDSM_CONFIG.mode === 'Port'){
					res.statusCode = 400;
					res.end("Not an MDSM request");
				}
				/* If on Middleware mode, call the callback with an error code of 0, signaling that this was
				 * a request without an MDSM cookie */
				else {
					next({
						errorCode: 0,	// Error code 0: No MDSM cookie
						errorText: 'Not an MDSM request (no MDSM cookie)'
					});
				}
			}
		}
	}

	/* Checks the list of endpoints to see whether a given URL pertains to a valid endpoint */
	function isValidEndpoint(url){
		/* Get a subset of the endpoints array for which the url matches the given url */
		let matchingEndpoints = endpoints.filter((ep)=>{
			return ep.url === url;
		});

		return (matchingEndpoints.length != 0);
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
	 * in the sessions array with a matching sessionID. Returns either an object containing
	 * the decrypted cookie and a reference to the Session object, or null if no matching
	 * session is found. */
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
			let filteredSessionList = sessions.filter((s)=>{
				return s.sessionID === sessionDataObject.sessionID;
			});
			if(filteredSessionList.length > 0){
				return {
					mdsmCookie: unencrypted,
					session: filteredSessionList[0]
				};
			} else {
				return null;
			}

			// for(var i = 0; i < sessions.length; i++){
			// 	if(sessions[i].sessionID === sessionDataObject.sessionID){
			// 		// console.log('Found matching session!');
			// 		// console.log(sessions[i]);
			// 		return {
			// 			mdsmCookie: unencrypted,
			// 			session: sessions[i]
			// 		};
			// 	}
			// }
		}

		/* The cookie could not be decrypted.  */
		catch(error){
			console.log(`MDSM error: Unable to decrypt MDSM cookie:\n\t[${sessionCookie}].\n` +
							`It may have been generated by a previous instance of MDSM.`
			);
			return null;
			// console.log(error.stack);
		}

		/* Return null if no matching session could be discerned */
		return null;
	}

	/* Create a session using a configuration object:
			{
				"title" : "newSessionInfo",
				"description" : "MDSM Session Configuration Object",
				"type" : "object",
				"properties" : {
					"sessionID":{
						"description" : "An ostensibly unique identifier for the session. Optional: If not provided, a 32-bit hex-encoded random value will be used.",
						"type" : "string"
					},
					"timeToLive":{
						"description": "The valid length of the session in milliseconds. Note that sessions may be extended beyond their initial TTL. See Session documentation.",
						"type": "number"
					},
					"sessionData":{
						"description": "An object containing arbitrary data",
						"type": "object"
					}
				}
			}
	*/
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

		if(!(newSessionInfo.sessionData)){
			newSessionInfo.sessionData = null;
		}

		/* Create a new session */
		let newSesh = new Session({
			sessionID: newSessionInfo.sessionID,
			expiryDate: Date.now() + newSessionInfo.timeToLive,
			sessionData: newSessionInfo.sessionData,
			validEndpoints: endpoints,
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
			/* If the session was expired and was successfully deleted, remove it from the sessions array */
			if(wasDestroyed){
				/* Find the index of the session object in the sessions array, and delete it */
				sessions.splice(sessions.indexOf(session),1);	//Delete 1 object at the index of the session
				console.log(`Session ${session.sessionID} was destroyed`);
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

	/* Extend the life of a session by a number of milliseconds */
	let renewSession = function(sessionID, extraTimeInMs){
		/* Find the session with the given sessionID */
		let session = sessions.filter((s)=>{
			return s.sessionID === sessionID;
		})[0];

		/* Extend the session's life by the specified number of milliseconds */
		session.extendSessionLife(extraTimeInMs);
	}

	/* Add a client based on info passed in */
	let addClient = function(newClientInfo){
		/* get the session from the newClientinfo */
		let session = newClientInfo.session;

		/* Tell the session to create a new client, which returns a client cookie */
		let clientCookie = session.addClient({
			clientClass: newClientInfo.clientClass,
			clientData: newClientInfo.clientData,
		});

		/* Return the client cookie ciphertext */
		return encrypt(clientCookie);
	}

	/* If the URL starts or begins with slashes, trims it to remove them. */
	function trimURL(url){
		let trimmedUrl = url;
		if(trimmedUrl.charAt(0) === '/'){
			trimmedUrl = trimmedUrl.substring(1,trimmedUrl.length);
		}
		if(trimmedUrl.charAt(trimmedUrl.length - 1) === '/'){
			trimmedUrl = trimmedUrl.substring(0,trimmedUrl.length - 1);
		}
		return trimmedUrl;
	}

	/* Performs AES-256 encryption on a plaintext using a randomly-generated key */
	function encrypt(plaintext){
		const encipher = crypto.createCipher('aes256', MDSM_CONFIG.secret);
		let encrypted = encipher.update(plaintext, 'utf8', 'base64');
		encrypted += encipher.final('base64');
		return encrypted;
	}

	/* Decrypts a ciphertext generated by the above encrypt function.
	 * Returns null if the ciphertext is invalid */
	function decrypt(ciphertext){
		// console.log(`Decrypting ciphertext: ${ciphertext}`);
		const decipher = crypto.createDecipher('aes256', MDSM_CONFIG.secret);
		try{
			let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
			decrypted += decipher.final('utf8');
			// console.log('Decrypted: ' + decrypted);
			return decrypted;
		} catch (error){
			throw error;
			return null;
		}
	}

	/* Revealing Module design pattern: Define the module's external public functions */
	let externalAPI = {
		init: init,
		createSession: createSession,
		renewSession: renewSession,
		addClient: addClient,

		/* If in middleware mode, expose the processRequest function. */
		processRequest: processRequestAsMiddleware,
	};

	return externalAPI;
}

module.exports = mdsm();
