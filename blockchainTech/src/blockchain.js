const CryptoJS = require("crypto-js"),
    hexToBinary = require("hex-to-binary");


const BLOCK_GENERATION_INTERVAL = 10;
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;

class Block {
    constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}

const genesisBlock = new Block(
    0,
    "856898262E02696A5DEA95B92EAB4A4EA940335111E258E884F8424310031CE0",
    null,
    Math.floor(new Date().getTime() / 1000),
    "This is the genesis block!",
    0,
    0
);

let blockchain = [genesisBlock];

const getLastBlock = () => blockchain[blockchain.length - 1];

const getTimestamp = () => Math.floor(new Date().getTime() / 1000);

const getBlockchain = () => blockchain;

const createHash = (index, previousHash, timestamp, data, difficulty, nonce) => 
    CryptoJS.SHA256(index + previousHash + timestamp + JSON.stringify(data) + difficulty + nonce).toString();

const createNewBlock = data => {
    const previousBlock = getLastBlock();
    const newBlockIndex = previousBlock.index + 1;
    const newTimestamp = getTimestamp();
    const difficulty = findDifficulty();
    const newHash = createHash(
        newBlockIndex,
        previousBlock.hash,
        newTimestamp,
        data
    );
    const newBlock = findBlock(
        newBlockIndex,
        previousBlock.hash,
        newTimestamp,
        data,
        difficulty
    );
    addBlockToChain(newBlock);
    require("./p2p").broadcastNewBlock();
    return newBlock;
};

const findDifficulty = (blockchain) => {
    const newestBlock = getLastBlock();
    if (newestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && newestBlock.index !== 0) {
        return calculateNewDifficulty(newestBlock, getBlockchain());
    } else {
        return newestBlock.difficulty;
    }
}

const calculateNewDifficulty = (newestBlock, blockchain) => {
    const lastCalculatedBlock = blockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
    const timeTaken = newestBlock.timestamp - lastCalculatedBlock.timestamp;
    if (timeTaken < timeExpected / 2) {
        return lastCalculatedBlock.difficulty + 1;
    } else if (timeTaken > timeExpected * 2) {
        return lastCalculatedBlock.difficulty - 1;
    } else {
        return lastCalculatedBlock.difficulty;
    }
};

const findBlock = (index, previousHash, timestamp, data, difficulty) => {
    let nonce = 0;
    while (true) {
        console.log('Current nonce: ', nonce);
        const hash = createHash(
            index,
            previousHash,
            timestamp,
            data,
            difficulty,
            nonce
            );
        //to do: check amount of zeros (hashMatchesDifficulty)
        if (hashMatchesDifficulty(hash, difficulty)) {
            return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
        }
        nonce++
    }
}

const hashMatchesDifficulty = (hash, difficulty) => {
    const hashInBinary = hexToBinary(hash);
    const requiredZeros = "0".repeat(difficulty);
    console.log('Trying difficulty: ', difficulty, ' with hash ', hashInBinary);
    return hashInBinary.startsWith(requiredZeros);
}

const getBlocksHash = block => createHash(
    block.index,
    block.previousHash,
    block.timestamp,
    block.data,
    block.difficulty,
    block.nonce);

const isTimeStampValid = (newBlock, oldBlock) => {
    return (
        oldBlock.timestamp - 60 < newBlock.timestamp &&
        newBlock.timestamp - 60 < getTimestamp()
    );
}

const isNewBlockValid = (candidateBlock, latestBlock) => {
    if (!isNewStructureValid(candidateBlock)) {
        console.log('The candidate block structure is not valid');
        return false;
    } else if (latestBlock.index + 1 !== candidateBlock.index) {
        console.log('The candidate block does not have a valid index.');
        return false;
    } else if (latestBlock.hash !== candidateBlock.previousHash) {
        console.log('The previous hash of the candidate block is not equal to the latest block\'s.');
        return false;
    } else if (getBlocksHash(candidateBlock) !== candidateBlock.hash) {
        console.log('The hash of this block is not valid.');
        return false;
    } else if (!isTimeStampValid(candidateBlock, latestBlock)) {
        console.log('The timestamp of this block is dodgy.')
        return false;
    }
    return true;
};

const isNewStructureValid = block => {
    return (
        typeof block.index === "number" &&
        typeof block.hash === "string" &&
        typeof block.previousHash === "string" &&
        typeof block.timestamp === "number" &&
        typeof block.data === "string"
    );
};

const isChainValid = (candidateChain) => {
    const isGenesisValid = block => {
        return JSON.stringify(block) === JSON.stringify(genesisBlock);
    };
    if (!isGenesisValid(candidateChain[0])) {
        console.log('The candidateChain\'s genesisBlock is not the same as our genesisBlock');
        return false;
    }
    for (let i = 1; i < candidateChain.length; i++) {
        if (!isNewBlockValid(candidateChain[i], candidateChain[i-1])) {
            return false;
        }
    }
    return true;
};

const sumDifficulty = anyBlockchain =>
    anyBlockchain
        .map(block => block.difficulty)
        .map(difficulty => Math.pow(2, difficulty))
        .reduce((a, b) => a + b);

const replaceChain = candidateChain => {
    if (
        isChainValid(candidateChain) &&
        sumDifficulty(candidateChain) > sumDifficulty(getBlockchain())
    ) {
        blockchain = candidateChain;
        return true;
    } else {
        return false;
    }
};

const addBlockToChain = candidateBlock => {
    if (isNewBlockValid(candidateBlock, getLastBlock())) {
        getBlockchain().push(candidateBlock);
        return true;
    } else {
        return false;
    }
};

module.exports = {
    getBlockchain,
    createNewBlock,
    getLastBlock,
    isNewBlockValid,
    isNewStructureValid,
    addBlockToChain,
    replaceChain
};