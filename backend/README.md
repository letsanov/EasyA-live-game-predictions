# Backend

Node.js backend with tRPC API, Drizzle ORM, and blockchain indexer.

## Structure

```
src/
├── db/              # Database schema and migrations
├── routers/         # tRPC API routes
├── services/        # Business logic
├── indexer/         # Blockchain event indexer
├── oracle/          # Market resolution oracle
└── index.ts         # Entry point
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run indexer` - Start blockchain indexer
- `npm run oracle:dota` - Start Dota 2 oracle
- `npm run oracle:ml-dota` - Start ML-powered oracle
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio
- `npm run db:clean` - Clean all database tables
