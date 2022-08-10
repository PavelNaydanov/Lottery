import { BigNumber } from "ethers";
import { ethers } from "hardhat";

export interface networkConfigItem {
  name: string
  vrfCoordinatorV2?: string
  entranceFee: BigNumber
  gasLane: string
  subscriptionId?: string
  callbackGasLimit: string
  interval: string
}

export interface INetworkConfig {
  [key: number]: networkConfigItem
}

const networkConfig: INetworkConfig = {
  4: {
    name: 'rinkeby',
    vrfCoordinatorV2: '0x6168499c0cFfCaCD319c818142124B7A15E857ab',
    entranceFee: ethers.utils.parseEther('0.01'),
    gasLane: '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
    subscriptionId: '9713',
    callbackGasLimit: '50000',
    interval: "30"
  },
  31337: {
    name: 'hardhat',
    entranceFee: ethers.utils.parseEther('0.01'),
    gasLane: '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
    callbackGasLimit: '50000',
    interval: "30"
  }
}

const developmentChains = ['hardhat', 'localhost'];
const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
const frontEndContractsFile = "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json";
const frontEndAbiFile = "../nextjs-smartcontract-lottery-fcc/constants/abi.json";

export {
  developmentChains,
  frontEndAbiFile,
  frontEndContractsFile,
  networkConfig,
  VERIFICATION_BLOCK_CONFIRMATIONS,
};