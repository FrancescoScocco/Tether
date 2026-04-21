const crypto = require('crypto');

class VaultManager {
    constructor() {
        this.processedIds = new Set();
        this.totalReserves = 1000000;
    }

    // This function ensures that if you call the same requestId twice,
    // the operation is not duplicated (Idempotence).
    async processMint(requestId, amount) {
        if (this.processedIds.has(requestId)) {
            return { status: 'REJECTED', reason: 'Duplicate Request ID' };
        }

        if (amount > this.totalReserves) {
            return { status: 'REJECTED', reason: 'Insufficient Reserves' };
        }

        this.processedIds.add(requestId);
        this.totalReserves -= amount;

        return {
            status: 'SUCCESS',
            txId: crypto.randomUUID(),
            remainingReserves: this.totalReserves
        };
    }
}

// TEST
const vault = new VaultManager();
const reqId = "ORDER_550";

async function runTest() {
    console.log("First attempt:", await vault.processMint(reqId, 5000));
    console.log("Second attempt (same ID):", await vault.processMint(reqId, 5000));
}
runTest();