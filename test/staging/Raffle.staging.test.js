// staging tests:
// 1. get our subId for ChainLink VRF - 6990
// 2. Deploy our contract using the SubId
// 3. Register the contract with ChainLink VRF & it's subId
// 4. Register the contract with ChainLink Keepers
// 5. Run staging tests

const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle, raffleEntranceFee, deployer; // , deployer

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              //console.log(`deployer: ${deployer}`);
              raffle = await ethers.getContract("Raffle", deployer);
              raffleEntranceFee = await raffle.getEntranceFee();
              //console.log(`raffleEntranceFee: ${raffleEntranceFee}`);
          });

          describe("fulfillRandomWords", function () {
              it("Works with live chainlink keepers and chainlink VRF, we get a random winner", async function () {
                  //console.log("Setting up test...");
                  // get start time
                  const startingTimeStamp = await raffle.getLatestTimeStamp();
                  const accounts = await ethers.getSigners();

                  // setup listener before we enter the raffle
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          //console.log("WinnerPicked event fired!");
                          try {
                              const recentWinner = await raffle.getRecentWinner();
                              //console.log(`recentWinner: ${recentWinner}`);
                              const raffleState = await raffle.getRaffleState();
                              const winnerEndingBalance = await accounts[0].getBalance();
                              //console.log(`winnerEndingBalance: ${winnerEndingBalance}`);
                              const endingTimeStamp = await raffle.getLatestTimeStamp();

                              //console.log("Starting asserts");
                              //await expect(raffle.getPlayer[0]).to.be.reverted;  --  {} instead of () caused hard to resolve error
                              await expect(raffle.getPlayer(0)).to.be.reverted;
                              assert.equal(recentWinner.toString(), accounts[0].address);
                              assert.equal(raffleState, 0);
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee.toString())
                              );
                              assert(endingTimeStamp > startingTimeStamp);
                              resolve();
                          } catch (error) {
                              console.log(error);
                              reject(e);
                          }
                      });

                      //enter the raffle
                      //console.log("Entering Raffle...");
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
                      await tx.wait(1);
                      //console.log("Ok, time to wait...");
                      // get starting balance
                      const winnerStartingBalance = await accounts[0].getBalance();
                  });
              });
          });
      });
