import {CatchUp, SyncRequest} from "./Messages.js";

export const SyncMixin = (nodeClass) => class extends nodeClass {
	// mixins should either:
	//   a) not define a constructor,
	//   b) require a specificconstructor signature
	//   c) pass along all arguments.

	constructor(id, roles, enableOptimizations) {
		super(id, roles, enableOptimizations);
	}

	sendSyncRequest() {
		if (this.isDown()) return;

		// select a node randomly from peers
		const targetNode = this._randomElementFromArray(super.peers);
		const syncRequest = new SyncRequest(super.paxosInstanceNumber, super.id, targetNode.id);
		super.messageHandler.send(syncRequest);
	}

	handleSyncRequest(syncRequest, masterId = undefined) {
		//Send catchup
		if (this.isDown()) return;

		const currentInstanceNumber = super.paxosInstanceNumber;
		if (syncRequest.paxosInstanceNumber >= currentInstanceNumber) return; //already up to date, ignore

		const firstMissingIdx = super.log.findIndex(logEntry => logEntry.paxosInstanceNumber >= syncRequest.paxosInstanceNumber);
		const missingLogEntries = super.log.slice(firstMissingIdx);
		const catchUp = new CatchUp(syncRequest, currentInstanceNumber, missingLogEntries, super.cluster, masterId);
		super.messageHandler.send(catchUp);
	}

	handleCatchup(catchUp) {
		if (this.isDown()) return;
		if (catchUp.paxosInstanceNumber <= super.paxosInstanceNumber) return;

		super.doCatchup(catchUp.paxosInstanceNumber, catchUp.missingLogEntries, catchUp.cluster);
	}

	updateTime(time) {
		if (this.lastSyncTime === undefined || time - this.lastSyncTime >= SYNC_INTERVAL) {
			this.lastSyncTime = time;
			this.sendSyncRequest();
		}
	}

	start() {
		super.start();
		// this.sendSyncRequest(); // eager sync when coming back online
	}

	_randomElementFromArray(array) {
		return array[Math.floor(Math.random() * array.length)];
	}

};

const SYNC_INTERVAL = 100000; //10 seconds