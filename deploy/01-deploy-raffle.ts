
import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

import {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} from '../helper-hardhat-config';
import verify from "../utils/verify";
import { VRFCoordinatorV2Mock } from '../typechain-types';

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30");

const deployRaffle: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId!;

  let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
  let vrfCoordinatorV2addres: string;
  let subscriptionId: string;

  if (developmentChains.includes(network.name)) {
    vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock');
    vrfCoordinatorV2addres = vrfCoordinatorV2Mock.address;

    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt!.events![0].args!.subId;

    vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
  }
  else {
    vrfCoordinatorV2addres = networkConfig[chainId]["vrfCoordinatorV2"]!;
    subscriptionId = networkConfig[chainId]["subscriptionId"]!;
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
    interval,
  ];

  const waitBlockConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS;

  const raffle = await deploy('Raffle', {
    from: deployer,
    args,
    log: true,
    waitConfirmations: waitBlockConfirmations
  });

  log(`Raffle contract is deployed: ${raffle.address}`);

  if (developmentChains.includes(network.name)) {
    vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock');
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
export default deployRaffle;
deployRaffle.tags = ["all", "raffle"];