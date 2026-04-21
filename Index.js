const Hypercore = require('hypercore');
const Hyperswarm = require('hyperswarm');
const Corestore = require('corestore');
const crypto = require('crypto');
const b4a = require('b4a');
const readline = require('readline');

const storagePath = process.argv[2] || './my-storage';
const store = new Corestore(storagePath);
const swarm = new Hyperswarm();

async function main() {
    // 1. Il nostro feed locale (dove scriviamo noi)
    const myCore = store.get({ name: 'my-prices', valueEncoding: 'json' });
    await myCore.ready();

    console.log('--- PEER AVVIATO ---');
    console.log('Cartella:', storagePath);
    console.log('Mia Chiave Pubblica:', b4a.toString(myCore.key, 'hex'));
    console.log('--------------------\n');

    // 2. Uniamoci alla rete
    const topic = crypto.createHash('sha256').update('tether-simple-test-v3').digest();
    swarm.join(topic);

    // 3. Cosa succede quando troviamo un altro peer
    swarm.on('connection', (socket) => {
        console.log('[Rete] Connesso a un peer, scambio chiavi...');
        
        // Sincronizza i dati
        store.replicate(socket);

        // MANDIAMO la nostra chiave all'altro peer
        socket.write(myCore.key);

        // RICEVIAMO la chiave dall'altro peer
        socket.on('data', async (data) => {
            if (data.length === 32) {
                const remoteKey = b4a.toString(data, 'hex');
                console.log('[Rete] Ricevuta chiave remota:', remoteKey.slice(0,6));
                
                // Carichiamo il feed dell'altro peer
                const otherCore = store.get({ key: data, valueEncoding: 'json' });
                await otherCore.ready();

                // Mostriamo lo storico
                for (let i = 0; i < otherCore.length; i++) {
                    const entry = await otherCore.get(i);
                    console.log(`[Storico] Peer ${remoteKey.slice(0,4)}: ${entry.pair} -> ${entry.price}`);
                }

                // Ascoltiamo i nuovi prezzi in tempo reale
                otherCore.on('append', async () => {
                    const entry = await otherCore.get(otherCore.length - 1);
                    console.log(`[LIVE] Peer ${remoteKey.slice(0,4)}: ${entry.pair} -> ${entry.price}`);
                });
            }
        });
    });

    // 4. Interfaccia per scrivere
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = () => {
        rl.question('Inserisci (es: BTC 60000): ', async (input) => {
            const [pair, price] = input.split(' ');
            if (pair && price) {
                await myCore.append({ pair: pair.toUpperCase(), price: price });
                console.log('✅ Inviato nel tuo log locale');
            }
            ask();
        });
    };
    ask();
}

main();

//lancia il comando node Index.js ./my-storage
//lancia il comando node Index.js ./storage2
//test