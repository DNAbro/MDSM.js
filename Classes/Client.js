class Client{
	constructor(clientID, clientClass, parentSession){
		this.clientID = clientID;
		this.clientClass = clientClass;
		this.parentSession = parentSession;
	}
}

module.exports = Client;
