export const CONTRACT_ADDRESS = "0x7ccfb0b8229ddf128206a3f307d81a39cfa72476";
export const SEPOLIA_CHAIN_ID = "0xaa36a7";
export const CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "string", "name": "message", "type": "string"}],
        "name": "sendGift",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "giftId", "type": "uint256"}],
        "name": "claimGift",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "giftId", "type": "uint256"}],
        "name": "getGift",
        "outputs": [
            {"internalType": "address", "name": "from", "type": "address"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "string", "name": "message", "type": "string"},
            {"internalType": "bool", "name": "claimed", "type": "bool"},
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "sender", "type": "address"}],
        "name": "getSentGifts",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "recipient", "type": "address"}],
        "name": "getReceivedGifts",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "giftCounter",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "uint256", "name": "giftId", "type": "uint256"},
            {"indexed": true, "internalType": "address", "name": "from", "type": "address"},
            {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
            {"indexed": false, "internalType": "string", "name": "message", "type": "string"}
        ],
        "name": "GiftSent",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "uint256", "name": "giftId", "type": "uint256"},
            {"indexed": true, "internalType": "address", "name": "claimer", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "GiftClaimed",
        "type": "event"
    }
];

export const formatEther = (value) =>
    (parseFloat(value) / 1e18).toString();

export const parseEther = (value) => {
    const valueInWei = Math.floor(parseFloat(value) * 1e18);
    return valueInWei.toString();
};

export const isAddress = (address) =>
    /^0x[a-fA-F0-9]{40}$/.test(address);
