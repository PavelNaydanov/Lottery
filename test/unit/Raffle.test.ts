import {
  network,
  deployments,
  ethers
} from 'hardhat';
import {
  assert,
  expect
} from 'chai';
import { BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import {
  developmentChains,
  networkConfig
} from '../../helper-hardhat-config';
import {
  Raffle,
  VRFCoordinatorV2Mock
} from "../../typechain-types";


!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle unit test", () => {
      const chainId = network.config.chainId!;

      let deployer: SignerWithAddress;
      let player: SignerWithAddress;
      let accounts: SignerWithAddress[];

      let raffle: Raffle;
      let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
      let raffleEntranceFee: BigNumber;
      let interval: BigNumber;

      beforeEach(async () => {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        player = accounts[1];

        await deployments.fixture(['all']);

        raffle = await ethers.getContract("Raffle");
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");

        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
      });

      describe("constructor", () => {
        it("initializes the raffle correctly", async () => {
          const raffleState = (await raffle.getRaffleState()).toString()
          const raffleInterval = (await raffle.getInterval()).toString()

          assert.equal(raffleState, "0")
          assert.equal(raffleInterval, networkConfig[chainId]["interval"]);
        });
      });

      describe("enterRaffle", function () {
        it("reverts when you don't pay enough", async () => {
            await expect(raffle.enterRaffle()).to.be.revertedWith(
              "Raffle__NotEnoughtEthEntered"
            );
        });

        it("records player when they enter", async () => {
            await raffle.connect(player).enterRaffle({ value: raffleEntranceFee });

            const contractPlayer = await raffle.getPlayer(0);

            assert.equal(player.address, contractPlayer);
        });

        it("emits event on enter", async () => {
            await expect(raffle.enterRaffle({ value: raffleEntranceFee })).emit(raffle, "RaffleEntered");
        });

        it("doesn't allow entrance when raffle is calculating", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee });

            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.request({ method: "evm_mine", params: [] });

            await raffle.performUpkeep([]);

            await expect(raffle.enterRaffle({ value: raffleEntranceFee })).revertedWith("Raffle__NotOpen");
        });
      });

      describe("checkUpkeep", function () {
        it("returns false if people haven't sent any ETH", async () => {
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.request({ method: "evm_mine", params: [] });

            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
            assert(!upkeepNeeded);
        });

        it("returns false if raffle isn't open", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee });

            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.request({ method: "evm_mine", params: [] });

            await raffle.performUpkeep([]);

            const raffleState = await raffle.getRaffleState();
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");

            assert.equal(raffleState.toString() == "1", upkeepNeeded == false);
        });

        it("returns false if enough time hasn't passed", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee });

            await network.provider.send("evm_increaseTime", [interval.toNumber() - 2]);
            await network.provider.request({ method: "evm_mine", params: [] });

            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
            assert(!upkeepNeeded);
        });

        it("returns true if enough time has passed, has players, eth, and is open", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.request({ method: "evm_mine", params: [] });
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");

            assert(upkeepNeeded);
        });
      });

      describe("performUpkeep", function () {
        it("can only run if checkupkeep is true", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee });

            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.request({ method: "evm_mine", params: [] });

            const tx = await raffle.performUpkeep("0x");
            assert(tx);
        });

        it("reverts if checkup is false", async () => {
          await expect(raffle.performUpkeep("0x")).to.be.revertedWith("Raffle__UpkeepNotNeeded");
        });

        it("updates the raffle state and emits a requestId", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });

          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({ method: "evm_mine", params: [] });

          const txResponse = await raffle.performUpkeep("0x");
          const txReceipt = await txResponse.wait(1);
          const raffleState = await raffle.getRaffleState();
          const requestId = txReceipt!.events![1].args!.requestId;

          assert(requestId.toNumber() > 0);
          assert(raffleState == 1);
        });
      });

      describe("fulfillRandomWords", function () {
        beforeEach(async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.request({ method: "evm_mine", params: [] });
        });

        it("can only be called after performupkeep", async () => {
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).revertedWith("nonexistent request");
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).revertedWith("nonexistent request");
        });

        it("picks a winner, resets, and sends money", async () => {
            const additionalEntrances = 3;
            const startingIndex = 2;

            for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                raffle = raffle.connect(accounts[i]) // Returns a new instance of the Raffle contract connected to player
                await raffle.enterRaffle({ value: raffleEntranceFee })
            }

            const startingTimeStamp = await raffle.getLastTimeStamp();

            // This will be more important for our staging tests...
            await new Promise<void>(async (resolve, reject) => {
                raffle.once("WinnerPicked", async () => { // event listener for WinnerPicked
                    console.log("WinnerPicked event fired!")
                    // assert throws an error if it fails, so we need to wrap
                    // it in a try/catch so that the promise returns event
                    // if it fails.
                    try {
                        // Now lets get the ending values...
                        const recentWinner = await raffle.getRecentWinner();
                        const raffleState = await raffle.getRaffleState();
                        const winnerBalance = await accounts[2].getBalance();
                        const endingTimeStamp = await raffle.getLastTimeStamp();

                        await expect(raffle.getPlayer(0)).reverted;
                        // Comparisons to check if our ending values are correct:
                        assert.equal(recentWinner.toString(), accounts[2].address);
                        assert.equal(raffleState, 0);
                        assert.equal(
                            winnerBalance.toString(),
                            startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                                .add(
                                    raffleEntranceFee
                                        .mul(additionalEntrances)
                                        .add(raffleEntranceFee)
                                )
                                .toString()
                        );

                        assert(endingTimeStamp > startingTimeStamp);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                const tx = await raffle.performUpkeep("0x");
                const txReceipt = await tx.wait(1);

                const startingBalance = await accounts[2].getBalance();

                await vrfCoordinatorV2Mock.fulfillRandomWords(
                    txReceipt!.events![1].args!.requestId,
                    raffle.address
                );
            });
        });
      });
    });