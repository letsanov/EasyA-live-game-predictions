const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.deployed();
  console.log("MockUSDC deployed to:", usdc.address);

  // Deploy Markets
  const Markets = await ethers.getContractFactory("Markets");
  const markets = await Markets.deploy(usdc.address);
  await markets.deployed();
  console.log("Markets deployed to:", markets.address);

  // Mint USDC to first few hardhat accounts for testing
  const signers = await ethers.getSigners();
  for (let i = 0; i < 5; i++) {
    await usdc.mint(signers[i].address, ethers.utils.parseUnits("10000", 6));
    console.log(`Minted 10,000 USDC to ${signers[i].address}`);
  }

  // Approve Markets contract to spend USDC for deployer
  await usdc.approve(markets.address, ethers.constants.MaxUint256);
  console.log("Approved Markets contract for deployer");

  console.log("\n--- Copy these addresses ---");
  console.log(`USDC_ADDRESS=${usdc.address}`);
  console.log(`MARKETS_ADDRESS=${markets.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
