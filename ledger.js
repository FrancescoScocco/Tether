const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');
const Hyperswarm = require('hyperswarm');
const Corestore = require('corestore');
const crypto = require('crypto');
const b4a = require('b4a');
const readline = require('readline');

const storagePath = process.argv[2] || './storage-ledger-1';
const store = new Corestore(storagePath);
const swarm = new Hyperswarm();

async function main() {
    // 1. Il nostro diario delle transazioni
    const myCore = store.get({ name: 'my-ledger' });
    
    // 2. Hyperbee: trasforma il diario in un database indicizzato (saldo rapido)
    const db = new Hyperbee(myCore, {
        keyEncoding: 'utf-8',
        valueEncoding: 'json'
    });
    await db.ready();

    const myAddress = b4a.toString(myCore.key, 'hex');
    console.log(`--- LEDGER P2P AVVIATO ---`);
    console.log(`Il tuo indirizzo (Wallet): ${myAddress}`);
    console.log(`--------------------------\n`);

    // 3. Uniamoci alla rete
    const topic = crypto.createHash('sha256').update('tether-ledger-v1').digest();
    swarm.join(topic);
    
    swarm.on('connection', (socket) => {
        store.replicate(socket);
        // Scambio chiavi (come abbiamo imparato prima)
        socket.write(myCore.key);
        socket.on('data', async (data) => {
            if (data.length === 32) {
                const remoteKey = b4a.toString(data, 'hex');
                console.log(`[Rete] Trovato peer: ${remoteKey.slice(0,6)}...`);
                const otherCore = store.get({ key: data });
                const otherDb = new Hyperbee(otherCore, { keyEncoding: 'utf-8', valueEncoding: 'json' });
                
                // Ogni volta che il peer invia una transazione, aggiorna la vista
                otherCore.on('append', () => console.log(`[Rete] Nuova transazione ricevuta dal peer!`));
            }
        });
    });

    // 4. Funzione per calcolare il saldo "on-the-fly"
    // In un sistema P2P serio, sommiamo i nostri invii e quelli degli altri
    async function getBalance() {
        let total = 1000; // Saldo iniziale ipotetico per tutti
        
        // Leggiamo tutte le transazioni nel NOSTRO database
        for await (const entry of db.createReadStream()) {
            if (entry.key.startsWith('tx!')) {
                total -= entry.value.amount; // Sottraggo quello che ho inviato
            }
        }
        return total;
    }

    // 5. Interfaccia CLI
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = () => {
        console.log(`\nSaldo attuale: ${undefined} (Calcolo...)`);
        getBalance().then(b => console.log(`Saldo attuale: ${b} USDT`));

        rl.question('Invia token (formato: INDIRIZZO QUANTITÀ): ', async (input) => {
            const [to, amountStr] = input.split(' ');
            const amount = parseInt(amountStr);

            if (to && amount > 0) {
                // Registriamo la transazione nel database P2P
                await db.put(`tx!${Date.now()}`, {
                    to: to,
                    amount: amount,
                    timestamp: Date.now()
                });
                console.log('✅ Transazione registrata e propagata!');
            } else {
                console.log('❌ Formato errato o quantità non valida.');
            }
            ask();
        });
    };
    ask();
}

main();

//LANCIA node ledger.js ./storage-peer1
//LANCIA node ledger.js ./storage-peer2