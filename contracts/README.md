# Smart Contracts

Solidity contracts for prediction markets on Ethereum.

## Structure

```
contracts/
├── YourContract.sol    # Main contract
└── interfaces/         # Contract interfaces
```

## Scripts

- `npx hardhat compile` - Compile contracts
- `npx hardhat test` - Run contract tests
- `npx hardhat node` - Start local blockchain on port 8545
- `npx hardhat run scripts/deploy.js` - Deploy contracts

## Getting Started

1. Write your Solidity contract in this directory
2. Compile with `npx hardhat compile`
3. Write tests in `test/` directory
4. Start local node: `npx hardhat node`
5. Deploy: `npx hardhat run scripts/deploy.js --network localhost`
6. Copy deployed contract address to `.env` as `CONTRACT_ADDRESS`

## Configuration

Hardhat is configured in `hardhat.config.cjs`:
- Solidity version: 0.8.20
- Local network: localhost:8545 (chainId 1337)
- Optimizer enabled (200 runs)
