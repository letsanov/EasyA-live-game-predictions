
<img width="500" height="120" alt="Screenshot 2026-02-12 at 6 03 55" src="https://github.com/user-attachments/assets/17494928-024b-420a-b2cd-595607c2c019" />
<img width="500" height="250" alt="Screenshot 2026-02-12 at 6 02 35" src="https://github.com/user-attachments/assets/a53b0b96-011c-41d6-9e2c-dfbd88c8ff77" />
<img width="450" height="270" alt="Screenshot 2026-02-12 at 6 08 41" src="https://github.com/user-attachments/assets/9ac23405-fe44-466f-ac7d-f196f2bdeeaf" />



# 4sight.gg — Live Esports Prediction Markets

**Live:** https://4sight.gg/games-alpha/

Demo:
Create and bet on market - https://www.loom.com/share/52d28c63c41e494eadef50b0446ee6e3
Claiming functionality - https://www.loom.com/share/5f0a68d283904fb3b5f3423835589285
I will make this into a full demo in a few minutes.

Technical walkthrough:

Pari-mutuel prediction markets for live Dota 2 matches, with AI-driven oracle resolution.

## How It Works

1. **Find a live match** — Search for a Dota 2 pro player currently in-game via the OpenDota API
2. **Prediction thread is created** — 3 markets spawn automatically for that match:
   - "First blood before 5 minutes?" (2 min betting window)
   - "Which team gets first tower?" (5 min betting window)
   - "Which team wins?" (15 min betting window)
3. **Users place bets** — Connect MetaMask, deposit USDC, pick an outcome
4. **Match ends** — The oracle fetches results from OpenDota
5. **AI resolves markets** — An LLM (Gemini 2.0 Flash) reads the match data and determines the winning outcome for each question
6. **Winners claim payouts** — Pari-mutuel pool distribution on-chain

## Tech Stack

| Layer               | Technology                                                                       |
| ------------------- | -------------------------------------------------------------------------------- |
| **Smart Contracts** | Solidity (Markets.sol) on Base                                                   |
| **Payments**        | USDC (real stablecoins)                                                          |
| **Backend**         | Node.js, TypeScript, tRPC, Fastify                                               |
| **Frontend**        | React, Vite, TypeScript, Tailwind CSS, shadcn/ui                                 |
| **Oracle**          | Centralized oracle service with LLM resolution (Gemini 2.0 Flash via OpenRouter) |
| **Data**            | OpenDota API for player search + match results                                   |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   Backend    │────▶│   OpenDota API   │
│  React/Vite  │     │  tRPC/Fastify│     │  (player search) │
└──────┬───────┘     └──────────────┘     └──────────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    Base      │◀────│   Oracle     │────▶│   OpenDota API   │
│  (on-chain)  │     │  (AI-driven) │     │  (match results) │
└──────────────┘     └──────┬───────┘     └──────────────────┘
                            │
                     ┌──────▼───────┐
                     │  OpenRouter  │
                     │  (Gemini LLM)│
                     └──────────────┘

No database. No indexer. Frontend reads directly from the smart contract.
```

## AI Oracle

Markets are resolved by a centralized oracle that combines real match data with LLM reasoning.

### How it works

1. Oracle polls the smart contract for unresolved markets past their deadline
2. Parses the match ID from the market name (e.g. `Topson [7113630876]: Which team wins?`)
3. Fetches match results from the OpenDota API
4. Summarizes the match data (duration, scores, first blood time, tower kills)
5. Sends the question + outcomes + match summary to **Gemini 2.0 Flash** via OpenRouter
6. LLM returns a structured JSON response: `{"outcome": 0, "reasoning": "..."}`
7. Oracle submits `resolveMarket(marketId, winningOutcomeIndex)` on-chain

### Backtest Results

We validated the oracle by replaying already-resolved markets through the LLM:

```
═══════════════════════════════════════════════════════
  ORACLE BACKTEST — LLM vs On-Chain Resolution
  Model: google/gemini-2.0-flash-001 via OpenRouter
═══════════════════════════════════════════════════════

Found 1 resolved market(s) to backtest.

┌─ Match 7113630876
│
│  RAW MATCH DATA:
│    Duration:     58m 12s
│    Winner:       Radiant
│    Score:        Radiant 53 - Dire 56 (109 total)
│    First Blood:  2.7m
│
│  ┌─ Market #9: "First blood before 5 minutes?"
│  │  Outcomes: 0="Yes", 1="No"
│  │  On-chain result: 0 = "Yes"
│  │  LLM answer:   0 = "Yes"
│  │  LLM reasoning: First blood occurred at 2.7 minutes, which is before 5 minutes.
│  │  ✅ CORRECT
│  └────
└────────────────────────────────────

═══════════════════════════════════════════════════════
  RESULTS: 1/1 correct (100%)
═══════════════════════════════════════════════════════
```

Run the backtest yourself:

```bash
npm run oracle:backtest
```

## Quick Start

### Prerequisites

- Node.js 18+
- MetaMask browser extension

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env — fill in BLOCKCHAIN_NETWORK, ORACLE_PRIVATE_KEY, OPENROUTER_API_KEY

# Start everything (backend + frontend)
npm run dev
```

### Running the Oracle

```bash
# Live oracle — polls every 30s, resolves markets automatically
npm run oracle

# Backtest — replay resolved markets through the LLM
npm run oracle:backtest
```

## Project Structure

```
├── contracts/          Solidity smart contracts
│   └── Markets.sol         Prediction market logic (create, bet, resolve, claim)
├── backend/            Node.js backend
│   └── src/
│       ├── routers/        tRPC API routes (player search, network config)
│       ├── services/       OpenDota API integration
│       ├── oracle/         AI oracle + backtest
│       └── config/         Network configuration (localhost/baseSepolia/base)
├── www-react/          React frontend
│   └── src/
│       ├── pages/          Route pages (Index, Portfolio, ThreadDetail)
│       ├── components/     UI components
│       ├── hooks/          Contract interaction + market data
│       └── contexts/       Wallet context
├── scripts/            Hardhat deploy scripts
└── docker-compose.games.yml   Production deployment
```

## Environment Variables

| Variable              | Required | Description                                        |
| --------------------- | -------- | -------------------------------------------------- |
| `BLOCKCHAIN_NETWORK`  | Yes      | `localhost`, `baseSepolia`, or `base`               |
| `ORACLE_PRIVATE_KEY`  | Yes      | Private key for the oracle wallet                  |
| `OPENROUTER_API_KEY`  | Yes      | API key for OpenRouter (LLM access)                |
| `OPEN_DOTA_API_KEY`   | No       | OpenDota API key (optional, increases rate limits) |

## License

MIT
