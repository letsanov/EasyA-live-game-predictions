# Frontend

React 19 frontend with Vite, tRPC client, and ethers.js wallet integration.

## Structure

```
src/
├── components/     # Reusable React components
├── pages/          # Page components (route handlers)
├── contexts/       # React contexts (WalletContext, ContractContext)
├── utils/          # Utility functions
├── App.tsx         # Main app component with routing
└── main.tsx        # Entry point
```

## Scripts

- `npm run dev` - Start development server on port 5173
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Getting Started

1. Create your first page component in `src/pages/`
2. Add routing in `src/App.tsx`
3. Use tRPC hooks to call backend API: `trpc.yourRouter.yourProcedure.useQuery()`
4. Connect wallet using ethers.js via WalletContext

## Environment Variables

Create `.env.local` in www-react/ directory:

```
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```
