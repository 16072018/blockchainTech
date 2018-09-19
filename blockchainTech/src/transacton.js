const CryptoJS = require("crypto-js"),
    elliptic = require("elliptic")
    utils = require("./utils");

const ec = new elliptic.ec('secp256k1');

class TxOutput {
    // how many coins there are and where they belong to
    constructor(address, amount) {
        this.address = address;
        this.amount = amount;
    }
}

class TxInput {
    // uTxOutputId
    // uTxOutputIndex
    // signature
}

class Transaction {
    // ID
    // txInputs[]
    // txOutputs[]

}

class UTxOutput {
    constructor(txOutputId, txOutputIndex, address, amount) {
        this.txOutputId = txOutputId;
        this.txOutputIndex = txOutputIndex;
        this.address = address;
        this.amount = amount;
    }
}

// Put all the blocks into the blockchain
// -- put all the transactions into an array
let uTxOutputs = [];


// Get the id of the transaction will be done by hashing transaction's output and input altogether
const getTxId = tx => {
    const txInputContent = tx.txInputs
        .map(txInput => txInput.uTxOutputId + txInput.uTxOutputIndex)
        .reduce((a, b) => a + b, "");

    const txOutputContent = tx.txOutputs
        .map(txOutput => txOutput.address + txOutput.amount)
        .reduce((a, b) => a + b, "");
    return CryptoJS.SHA256(txInputContent + txOutputContent).toString();
};

const findUTxOutput = (txOutputId, txOutputIndex, uTxOutputList) => {
    return uTxOutputList.find(
        uTxOutput => txOutput.txOutputId === txOutputId && txOutput.txOutputIndex === txOutputIndex
    );
};

// Sign the transaction input to varify the blockchain that those are our inputs
// to sign, we need to find the transaction input then output that the input is referencing
const signTxInput = (tx, txInputIndex, privateKey, unspentTxOutput) => {
    const txInput = tx.txInputs[txInputIndex];
    const dataToSign = tx.id;
    // To Do: Find txOutput this input is pointing
    // check if have enough coin(money) to make the transaction
    const referencedUTxOutput = findUTxOutput(txInput.txOutputId, tx.txOutputIndex, uTxOutputs);
    if (referencedUTxOutput === null) {
        return;
    }
     // To Do: sign the txInput
     const key = ec.keyFromPrivate(privateKey, "hex");
     const signature = utils.toHexString(key.sign(dataToSign).toDER());
     // toDER(): der is a format of the signature
     return signature;
};

// get transaction id, sign the id and get the reference uTxOutput (which will be input)
// our transaction input is referencing a valid uTxOutput then we sign.

const updateUTxOutputs = (newTxs, uTxOutputList) => {
    //get all transaction outputs from a transaction
    const newUTxOutputs = newTxs.map(tx => {
        tx.txOutputs.map(
            (txOutput, index) => {
                //iterate all the transactions and iterate all the transaction outputs
                //and then create new transaction output
                new UTxOutput(tx.id, index, txOutput.address, txOutput.amount);
            });
    }).reduce((a, b) => a.concat(b), []);
    
    //Declare a new function to find the transaction outputs that are used as inputs
    //and to empty them.
    const spentTxOutputs = newTxs
        .map(tx => tx.txInputs)
        .reduce((a, b) => a.concat(b), [])
        .map(txInput => new UTxOutput(txInput.txOutputId, txInput.txOutputIndex, '', 0));

    //Now need to remove transactions that are already spent
    //and add the newly created ones
    const resultingUTxOutputs = uTxOutputList.filter(
        uTxOutput => !findUTxOutput(uTxOutput.txOutputId, uTxOutput.txOutputIndex, spentTxOutputs)
        ).concat(newUTxOutputs);
};
//Check every transaction inputs inside the inputs array is valid (Related to Class TxInput)
const isTxInStructureValid = (txInput) => {
    if (txInput === null) {
        return false;
    } else if (typeof txInput.signature !== "string") {
        return false;
    } else if (typeof txInput.uTxOutputId !== "string") {
        return false;
    } else if (typeof txInput.uTxOutputIndex !== "number") {
        return false;
    } else {
        return true;
    }
}

const isAddressValid = address => {
    if (address.length !== 130) {
        return false;
    } else if (address.match("^[a-fA-F0-9]+$") === null) {
        return false;
    } else if (!address.startsWith("04")) {
        return false;
    } else {
        return true;
    }
};

//Check every transaction outputs inside the outputs array is valid (Related to Class transaction)
const isTxOutStructureValid = (txOutput) => {
    if (txOutput === null) {
        return false;
    } else if (typeof txOutput.address !== "string") {
        return false;
    } else if (!isAddressValid(txOutput.address)) {
        return false;
    } else if (typeof txOutput.amount !== "number") {
        return false;
    } else {
        return true;
    }
};

//Validate transaction structure
const isTxStructureValid = (tx) => {
    if (typeof tx.id !== "string") {
        console.log("Transaction ID is not valid");
        return false;
    } else if (!(tx.txInputs instanceof Array)) {
        console.log("The transaction inputs are not an array");
        return false;
    } else if (!tx.txInputs.map(isTxInStructureValid).reduce((a, b) => a && b, true)) {
        console.log("The structure of one of the transaction inputs is not valid")
        return false;
    } else if (!(tx.txOutputs instanceof Array)) {
        console.log("The transaction outputs are not an array")
        return false;
    } else if (!tx.txOutputs.map(isTxOutStructureValid).reduce((a, b) => a && b, true)) {
        console.log("The sturcture of one of the transaction outputs is not valid")
        return false;
    } else {
        return true;
    }
};