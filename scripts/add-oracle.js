const { ethers } = require("hardhat");

const MARKETS_ADDRESS = "0x5FDD385eb091893628c2b79a7E259cBfCABa6432";

async function main() {
  const [deployer] = await ethers.getSigners();
  const Markets = await ethers.getContractFactory("Markets");
  const markets = Markets.attach(MARKETS_ADDRESS);

  console.log("Owner:", await markets.owner());
  console.log("Deployer:", deployer.address);

  const tx = await markets.addTrustedOracle(deployer.address, { gasLimit: 100000 });
  const receipt = await tx.wait();
  console.log("Trusted oracle added! tx:", receipt.transactionHash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
