const {
  network,
  ethers
} = require("hardhat");
const {
    networkConfig,
    developmentChains,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  let vrfCoordinatorV2Mock;
  let vrfCoordinatorV2addres;
  let subscriptionId;

  if (developmentChains.includes(network.name)) {
    vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock');
    vrfCoordinatorV2addres = vrfCoordinatorV2Mock.address;

    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1)
    subscriptionId = transactionReceipt.events[0].args.subId

    vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
  }
  else {
    vrfCoordinatorV2addres = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }

  const entranceFee = networkConfig[chainId]["entranceFee"];
  const gasLane = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const interval = networkConfig[chainId]["interval"];

  const args = [
    vrfCoordinatorV2addres,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval
  ];

  const raffle = await deploy('Raffle', {
    from: deployer,
    args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1
  });

  log(`Raffle contract is deployed: ${raffle.address}`);

  if (developmentChains.includes(network.name)) {
    await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);

    log('Consumer is added');
  }

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(raffle.address, args);
  }

  log("----------------------------------");
}

module.exports.tags = ["all", "raffle"];