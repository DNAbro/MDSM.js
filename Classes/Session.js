const crypto = require('crypto');
const Client = require("./Client.js");

class Session{
	constructor(newSessionInfo){
		/* Set the session ID */
		this.sessionID = newSessionInfo.sessionID;
		this.expiryDate = newSessionInfo.expiryDate;

		/* Create a unique session secret for crypto services */
		this.sessionSecret = crypto.randomFillSync(Buffer.alloc(32), 0, 32).toString('base64');
	}

	/* Extends the life of the current session by a specified number of milliseconds.
	 * The selfDstruct function will verify that the current time is greater than them
	 * expiry date before deleting the session. */
	extendSessionLife(additionalLifeMs){
		this.expiryDate += additionalLifeMs;
	}

	attemptSelfDestruct(){
		console.log('Attempting to delete session [' + this.sessionID + ']');
		console.log('Its expiry date is ' + (this.expiryDate) + ' and the current time is ' + (Date.now()));
		/* Get the difference in ms between expiry date and the current time */
		let true_ttl = this.expiryDate - Date.now();
		console.log(`true_ttl: ${true_ttl}`);

		/* If the ttl is not positive (meaning the expiry date is smaller than the
		 * current date), delete the session. */
		if(true_ttl <= 0){
			console.log('Deleting session ' + this.sessionID);
			delete this;	// Delete the Session object
			return true;	// Signal that the deletion was successful
		}

		/* Otherwise, return false to indicate that the session should not be deleted yet */
		else return false;

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
