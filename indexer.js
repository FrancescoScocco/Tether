const { ethers } = require('ethers');

// Monitoraggio USDT su rete Ethereum (Mainnet)
async function monitorUSDT() {
    const USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    // Nota: Per farlo girare davvero serve un URL WebSocket di Alchemy o Infura
    //const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com"); 
    //const provider = new ethers.JsonRpcProvider("https://cloudflare-eth.com");
    //const provider = new ethers.JsonRpcProvider("https://rpc.ankr.com/eth");
    const provider = new ethers.JsonRpcProvider("https://rpc.flashbots.net");

    const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
    const contract = new ethers.Contract(USDT_CONTRACT, abi, provider);

    console.log("In ascolto di trasferimenti USDT (Esempio via RPC)...");

    // Prendiamo gli ultimi trasferimenti
    const filter = contract.filters.Transfer();
    const logs = await contract.queryFilter(filter, -10); // ultimi 10 blocchi

    logs.forEach(log => {
        console.log(`TX: ${ethers.formatUnits(log.args[2], 6)} USDT inviati a ${log.args[1]}`);
    });
}

monitorUSDT();

//node indexer.js