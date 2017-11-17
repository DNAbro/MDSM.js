class Client{
	constructor(clientID, clientClass, parentSession){
		this.clientID = clientID;
		this.clientClass = clientClass;
		this.parentSession = parentSession;
	}

	get clientID(){
		return this.clientID;
	}

	get clientClass(){
		return this.clientClass;
	}
}

module.exports = Client;
