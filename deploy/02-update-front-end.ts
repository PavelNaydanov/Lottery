import {
  frontEndAbiFile,
  frontEndContractsFile,
} from "../helper-hardhat-config";
import fs from "fs";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const updateUI: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Writing to front end...");

    await updateContractAddresses(hre);
    await updateAbi(hre);

    console.log("Front end written!");
  }
}
export default updateUI;
updateUI.tags = ["all", "frontend"];

async function updateAbi(hre: HardhatRuntimeEnvironment) {
  const { ethers } = hre;

  const raffle = await ethers.getContract("Raffle");
  fs.writeFileSync(frontEndAbiFile, raffle.interface.format(ethers.utils.FormatTypes.json) as any);
}

async function updateContractAddresses(hre: HardhatRuntimeEnvironment) {
  const { network, ethers } = hre;

  const raffle = await ethers.getContract("Raffle");
  const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"));

  if (network.config.chainId!.toString() in contractAddresses) {
      if (!contractAddresses[network.config.chainId!.toString()].includes(raffle.address)) {
        contractAddresses[network.config.chainId!.toString()].push(raffle.address);
      }
  } else {
    contractAddresses[network.config.chainId!.toString()] = [raffle.address];
  }

  fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses));
}