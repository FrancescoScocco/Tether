const crypto = require('crypto');

class VaultManager {
    constructor() {
        this.processedIds = new Set();
        this.totalReserves = 1000000;
    }

    // Questa funzione garantisce che se chiami due volte lo stesso requestId,
    // l'operazione non viene duplicata (Idempotenza).
    async processMint(requestId, amount) {
        if (this.processedIds.has(requestId)) {
            return { status: 'REJECTED', reason: 'Duplicate Request ID' };
        }

        // Simulazione di un controllo di sicurezza atomico
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
    console.log("Primo tentativo:", await vault.processMint(reqId, 5000));
    console.log("Secondo tentativo (stesso ID):", await vault.processMint(reqId, 5000));
}
runTest();