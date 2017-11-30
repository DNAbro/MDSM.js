const crypto = require('crypto');
const Client = require("./Client.js");

class Session{
	constructor(newSessionInfo){
		/* Set the session ID */
		this.sessionID = newSessionInfo.sessionID;
		this.expirtDate = newSessionInfo.expiryDate;

		/* Create a unique session secret for crypto services */
		this.sessionSecret = crypto.randomFillSync(Buffer.alloc(32), 0, 32).toString('base64');
	}

	/* Extends the life of the current session by a specified number of milliseconds.
	 * The selfDstruct function will verify that the current time is greater than them
	 * expiry date before deleting the session. */
	extendSessionLife(additionalLifeMs){
		this.expiryDate += additionalLifeMs;
	}

	selfDestruct(){
		console.log('Session ' + this.sessionID + ' has expired.');
		/* Get the difference in ms between the current time and the expiryDate of the session */
		let true_ttl = this.expiryDate - Date.now();
		console.log(`true_ttl: ${true_ttl}`);
		/* If the current time is greater than the expiry date (meaning the session was
		 * not renewed to extend its ttl), delete the session. */
		if(true_ttl <= 0){
			console.log('Deleting session ' + this.sessionID);
			delete this;
		}

		/* Otherwise, set a new timeout to try again */
		else {
			setTimeout(
				()=>{this.selfDestruct()},	// The selfDestruct function will be called in {ttl} milliseconds
				true_ttl
			);
		}
	}

	addClient(){
		let newClient = new Client(crypto.randomFillSync(Buffer.alloc(32), 0, 32).toString('hex'));
	}

	encrypt(data){
		this.cipher = crypto.createCipher('aes256', this.sessionSecret);
		let encrypted = this.cipher.update(data, 'utf8', 'hex');
		encrypted += this.cipher.final('hex');
		return encrypted;
	}

	decrypt(encryptedData){
		this.decipher = crypto.createDecipher('aes256', this.sessionSecret);
		let decrypted = this.decipher.update(encryptedData, 'hex', 'utf8');
		decrypted = this.decipher.final('utf8');
		return decrypted;
	}
}

module.exports = Session;
