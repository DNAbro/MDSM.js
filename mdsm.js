const Client = require("./Classes/Client.js");
const Client = require("./Classes/ClientClass.js");
const Client = require("./Classes/Session.js");

let mdsm = function(){
	var port;

	let sessions = [];
	let endpoints = [];
	let clientClasses = [];

	let init = function(config){
		port = config.port;
		url = config.url;
	}

	let processRequest = function(req){

	}

	let createClientClass = function(clientClassID){
		clientClasses.insert(new ClientClass(clientClassID));
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
		processRequest: processRequest,
		expressHook: expressHook
	}
}

module.exports = mdsm();
