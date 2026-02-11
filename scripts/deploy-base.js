const { ethers, network } = require("hardhat");

// Official Circle USDC addresses
const USDC_ADDRESSES = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

async function main() {
  const networkName = network.name;
  const usdcAddress = USDC_ADDRESSES[networkName];

  if (!usdcAddress) {
    console.error(`Unknown network: ${networkName}. Use --network base or --network baseSepolia`);
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  const balance = await deployer.getBalance();

  console.log(`Network:  ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.utils.formatEther(balance)} ETH`);
  console.log(`USDC:     ${usdcAddress}\n`);

  if (balance.eq(0)) {
    console.error("Deployer has no ETH for gas. Fund the wallet first.");
    process.exit(1);
  }

  // Deploy Markets
  console.log("Deploying Markets...");
  const Markets = await ethers.getContractFactory("Markets");
  const markets = await Markets.deploy(usdcAddress);
  await markets.deployed();
  console.log(`Markets deployed to: ${markets.address}`);

  // Add deployer as trusted oracle
  console.log("Adding deployer as trusted oracle...");
  const tx = await markets.addTrustedOracle(deployer.address, { gasLimit: 100000 });
  await tx.wait();
  console.log(`Trusted oracle added: ${deployer.address}`);

  console.log("\n--- Deployment complete ---");
  console.log(`MARKETS_ADDRESS=${markets.address}`);
  console.log(`USDC_ADDRESS=${usdcAddress}`);
  console.log(`ORACLE_ADDRESS=${deployer.address}`);
  console.log(`\nVerify on ${networkName === "base" ? "https://basescan.org" : "https://sepolia.basescan.org"}/address/${markets.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
