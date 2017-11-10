let mdsm = function(){
	let sessions = [];
	let endpoints = [];

	let init = function(config){
		console.log('Initiating instance with config:');
		console.log(config);
	}

	/* Allows the framework to be used as Express.js middleware. Usage:
	 * 	var app = express();
	 *		var mdsm = require('mdsm');
	 *		app.use('/some/path',mdsm.expressHook());
	 */
	let expressHook = function(req,res,next){

		next();
	}

	return {
		init: init,
		expressHook: expressHook
	}
}

module.exports = mdsm();
