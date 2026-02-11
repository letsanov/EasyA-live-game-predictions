const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const USER_WALLET = "0x773c1a59ae833ee7e36af983379ea0a93a6f4c71";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Seeding with deployer:", deployer.address);

  // 1. Deploy MockUSDC
  console.log("\n💰 Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.deployed();
  console.log("✅ MockUSDC deployed to:", usdc.address);

  // 2. Deploy Markets contract
  console.log("\n📦 Deploying Markets contract...");
  const Markets = await ethers.getContractFactory("Markets");
  const markets = await Markets.deploy(usdc.address);
  await markets.deployed();
  console.log("✅ Markets deployed to:", markets.address);

  // 3. Mint 10,000 USDC to user wallet
  console.log("\n💰 Minting USDC...");
  const mintAmount = ethers.utils.parseUnits("10000", 6); // 10,000 USDC

  await usdc.mint(USER_WALLET, mintAmount);
  console.log(`   ✅ Minted 10,000 USDC to ${USER_WALLET}`);

  // Send ETH for gas
  await deployer.sendTransaction({
    to: USER_WALLET,
    value: ethers.utils.parseEther("100"),
  });
  console.log(`   ✅ Sent 100 ETH to ${USER_WALLET} for gas`);

  // 4. Save deployment addresses
  const deploymentsDir = path.join(__dirname, "../deployments/localhost");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deployment = {
    marketsAddress: markets.address,
    usdcAddress: usdc.address,
    userWallet: USER_WALLET,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(deploymentsDir, "deployment.json"),
    JSON.stringify(deployment, null, 2)
  );

  console.log("\n--- Addresses ---");
  console.log(`USDC_ADDRESS=${usdc.address}`);
  console.log(`MARKETS_ADDRESS=${markets.address}`);
  console.log(`USER_WALLET=${USER_WALLET}`);
  console.log("\n✅ Seed complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
