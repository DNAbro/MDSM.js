const Client = require("./Classes/Client.js");
const ClientClass = require("./Classes/ClientClass.js");
const Session = require("./Classes/Session.js");

let mdsm = function(){
	var port;		// Server will listen to requests to this port
	var rootUrl;	// The root URL for all endpoint calls (e.g. '/api/')

	/* HTTPS is optional. */
	var httpsConfig = {
		httpsEnabled: false,
		key: null,
		cert: null,
		ca: null
	};

	let sessions = [];			// Will be populated with sessions as they are initialized
	let endpoints = [];			// Will contain a list of valid endpoints
	let clientClasses = [];		// Will contain a list of valid client classes

	/* Initializes an instance based on the given configuration. See documentation for "config" schema */
	let init = function(config){
		port = config.port;
		url = config.url;
		if(config.https){
			httpsConfig.httpsEnabled = true;
			httpsConfig.key = config.https.key;
			httpsConfig.cert = config.https.cert;
			httpsConfig.ca = config.https.ca;
		}
	}

	let createClientClass = function(clientClassID){
		let newClientClass = new ClientClass(clientClassID);
		return newClientClass;
	}

	/* Create a new endpoint */
	let addEndpoint = function(newEndpointInfo){
		endpoints.insert(newEndpointInfo.url);
		if(!(clientClasses.includes(newEndpointInfo.allowedClassTypes))){
			clientClasses.insert(newEndpointInfo.allowedClassTypes);
		}
	}

	let processRequest = function(req){

	}

	/* Allows the framework to be used as Express.js middleware. Usage:
	 * 	var app = express();
	 *		var mdsm = require('mdsm');
	 *		app.use('/some/path',mdsm.expressHook());
	 */
	let expressHook = function(req,res,next){
		// Do something
		next();
	}

	return {
		init: init,
		createClientClass: createClientClass,
		addEndpoint: addEndpoint,
		processRequest: processRequest,
		expressHook: expressHook
	}
}

module.exports = mdsm();
