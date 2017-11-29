const crypto = require('crypto');
const Client = require("./Client.js");

class Session{
	constructor(sessionID){
		this.sessionID = sessionID;
		this.sessionSecret = crypto.randomFillSync(Buffer.alloc(32), 0, 32).toString('base64');
		this.cipher = crypto.createCipher('aes256', this.sessionSecret);
		this.decipher = crypto.createDecipher('aes256', this.sessionSecret);
		console.log(`Session secret: ${this.sessionSecret}`);
		console.log('Encrypted session ID:' + this.encrypt(sessionID));
	}

	addClient(){
		let newClient = new Client(crypto.randomFillSync(Buffer.alloc(32), 0, 32).toString('hex'));
	}

	encrypt(data){
		let encrypted = this.cipher.update(data, 'utf8', 'hex');
		encrypted += this.cipher.final('hex');
		return encrypted;
	}

	decrypt(encryptedData){
		let decrypted = this.decipher.update(encryptedData, 'hex', 'utf8');
		decrypted = this.decipher.final('utf8');
		return decrypted;
	}
}

module.exports = Session;
