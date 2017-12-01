class Client{
	constructor(newClientInfo){
		this.clientID = newClientInfo.clientID;
		this.clientClass = newClientInfo.clientClass;
		this.clientData = newClientInfo.clientData;
		this.parentSession = newClientInfo.parentSession;
	}
}

module.exports = Client;
