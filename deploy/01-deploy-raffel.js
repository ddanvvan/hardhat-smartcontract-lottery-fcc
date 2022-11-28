//console.log("At start of 01-deploy-raffel");
const { network, ethers } = require("hardhat");
const {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const FUND_AMOUNT = ethers.utils.parseEther("30"); // 1 Ether, or 1e18 (10^18) Wei

//console.log("At start of module.exports");
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;

    //if (chainId == 31337) { // dan - changed to:
    if (developmentChains.includes(network.name)) {
        // create VRFV2 Subscription
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        subscriptionId = transactionReceipt.events[0].args.subId;
        // Fund the subscription
        // Our mock makes it so we don't actually have to worry about sending fund
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainId]["subscriptionId"];
    }

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS;

    log("----------------------------------------------------");

    // address vrfCoordinatorV2,
    // uint256 entranceFee,
    // bytes32 gasLane / keyHash,
    // uint64 subscriptionId,
    // uint32 callbackGasLimit,
    // uint256 interval
    //log(`vrfCoordinatorV2Address: ${vrfCoordinatorV2Address}`);
    //log(`EntranceFee: ${networkConfig[chainId]["EntranceFee"]}`);
    //log(`gasLane: ${networkConfig[chainId]["gasLane"]}`);
    //log(`subscriptionId: ${subscriptionId}`);
    //log(`callbackGasLimit: ${networkConfig[chainId]["callbackGasLimit"]}`);
    //log(`keepersUpdateInterval: ${networkConfig[chainId]["keepersUpdateInterval"]}`);
    const arguments = [
        vrfCoordinatorV2Address,
        networkConfig[chainId]["EntranceFee"],
        networkConfig[chainId]["gasLane"],
        subscriptionId,
        networkConfig[chainId]["callbackGasLimit"],
        networkConfig[chainId]["keepersUpdateInterval"],
    ];
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    });

    // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
    if (developmentChains.includes(network.name)) {
        // vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        //await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId.toNumber(), raffle.address);
    }

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...");
        await verify(raffle.address, arguments);
    }

    log("Enter lottery with command:");
    const networkName = network.name == "hardhat" ? "localhost" : network.name;
    log(`yarn hardhat run scripts/enterRaffle.js --network ${networkName}`);
    log("----------------------------------------------------");
};

module.exports.tags = ["all", "raffle"];