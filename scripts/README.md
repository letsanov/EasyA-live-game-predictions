# Scripts

Hardhat scripts for contract deployment and blockchain operations.

## Structure

```
scripts/
├── deploy.js       # Deploy contracts to blockchain
└── seed.js         # Seed initial data
```

## Usage

Run scripts with Hardhat:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

## deploy.js

Deploy your smart contracts and output addresses:

```javascript
const { ethers } = require("hardhat");

async function main() {
  const Contract = await ethers.getContractFactory("YourContract");
  const contract = await Contract.deploy();
  await contract.deployed();

  console.log("Contract deployed to:", contract.address);
}

main();
```

## seed.js

Seed initial data after deployment:

```javascript
// Create initial markets, users, etc.
```
