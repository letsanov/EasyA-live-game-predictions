# Setup Guide

Quick start guide for getting the development environment running.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database running
- Git

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/letsanov/EasyA-live-game-predictions.git
   cd EasyA-live-game-predictions
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in:
   - `DATABASE_URL` - PostgreSQL connection string
   - Other API keys as needed

4. **Setup database**
   ```bash
   # Push schema to database
   npm run db:push --workspace=backend

   # (Optional) Open Drizzle Studio to inspect DB
   npm run db:studio --workspace=backend
   ```

5. **Start local blockchain**
   ```bash
   # In a separate terminal
   npx hardhat node
   ```

   Keep this running - it's your local Ethereum blockchain.

6. **Deploy contracts**
   ```bash
   # In another terminal
   npx hardhat run scripts/deploy.js --network localhost
   ```

   Copy the contract address to `.env` as `CONTRACT_ADDRESS`.

7. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Backend API on http://localhost:3001
   - Frontend on http://localhost:5173
   - Blockchain indexer
   - Any oracles/schedulers

## Verify Setup

- Open http://localhost:5173 in your browser
- You should see the frontend loading
- Check console for any errors

## Common Issues

**"EADDRINUSE port 8545"**
- Hardhat node already running. Kill it: `pkill -f "hardhat node"`

**"Cannot connect to database"**
- Check PostgreSQL is running
- Verify `DATABASE_URL` in `.env` is correct

**"Contract not found"**
- Make sure you deployed contracts and copied address to `.env`
- Restart the dev servers after updating `.env`

## Development Workflow

1. Make changes to code
2. Hot reload will update automatically (backend + frontend)
3. If you change Solidity contracts:
   - Recompile: `npx hardhat compile`
   - Restart hardhat node
   - Redeploy contracts
   - Update contract address in `.env`
   - Restart dev servers

## Next Steps

- Read `backend/README.md` for backend structure
- Read `www-react/README.md` for frontend structure
- Read `contracts/README.md` for smart contract development
- Check `CLAUDE.md` for AI assistant instructions
