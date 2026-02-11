import { ethers } from 'ethers';
import { getMatchDetails } from '../services/opendota.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY!;
const RPC_URL = 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const POLL_INTERVAL = 30_000; // 30s

const MARKETS_ABI = [
  "function getMarketsPage(uint256 offset, uint256 limit) external view returns (uint256 totalMarkets, uint256[] memory ids, string[] memory names, string[][] memory outcomes, address[] memory creators, address[] memory oracles, uint256[] memory predictionDeadlines, bool[] memory isResolved, bool[] memory isCancelled, uint256[] memory winningOutcomes, uint256[] memory totalPoolAmounts, uint256[] memory resolvedTimestamps, bool[] memory unclaimedWinningsCollected, uint256[] memory creationTimestamps, uint256[][] memory poolAmounts)",
  "function resolveMarket(uint256 marketId, uint256 winningOutcomeIndex) external",
];

interface MarketInfo {
  id: number;
  name: string;
  outcomes: string[];
  oracle: string;
  predictionDeadline: number;
  isResolved: boolean;
  isCancelled: boolean;
}

function parseMatchId(marketName: string): string | null {
  const match = marketName.match(/\[(\d+)\]/);
  if (match) return match[1];
  const oldMatch = marketName.match(/^Match (\d+):/);
  return oldMatch ? oldMatch[1] : null;
}

function parseQuestion(marketName: string): string {
  return marketName.replace(/^(?:.+?\[\d+\](?:\s*\{.+?\})?|Match \d+):\s*/, '');
}

function determineOutcome(question: string, outcomes: string[], matchData: any): number | null {
  const q = question.toLowerCase();

  // "First blood before 5 minutes?" → Yes/No
  if (q.includes('first blood')) {
    const fbTime = matchData.first_blood_time ?? 999;
    const minuteMatch = q.match(/before (\d+) minutes/);
    const threshold = minuteMatch ? Number(minuteMatch[1]) * 60 : 5 * 60;
    return fbTime < threshold ? 0 : 1;
  }

  // "Which team gets first tower?" → Radiant/Dire
  if (q.includes('first tower')) {
    // OpenDota objectives array: look for first "building_kill" with key containing "tower"
    const objectives = matchData.objectives || [];
    const firstTower = objectives.find((obj: any) =>
      obj.type === 'building_kill' && obj.key?.includes('tower')
    );
    if (firstTower) {
      // player_slot < 128 = radiant
      return firstTower.player_slot < 128 ? 0 : 1;
    }
    // Fallback: team that won likely got first tower
    return matchData.radiant_win ? 0 : 1;
  }

  // "Which team wins?" → Radiant/Dire
  if (q.includes('which team wins') || q.includes('who wins')) {
    return matchData.radiant_win ? 0 : 1;
  }

  // "Game ends before N minutes?" → Yes/No
  if (q.includes('ends before') || q.includes('before') && q.includes('minutes')) {
    const minuteMatch = q.match(/before (\d+) minutes/);
    const threshold = minuteMatch ? Number(minuteMatch[1]) : 45;
    const durationMinutes = (matchData.duration || 0) / 60;
    return durationMinutes < threshold ? 0 : 1;
  }

  // "Total kills in game?" → thresholds like 10+, 30+, 50+, 100+, 150+
  if (q.includes('total kills')) {
    const totalKills = (matchData.radiant_score || 0) + (matchData.dire_score || 0);
    const thresholds = outcomes.map(o => parseInt(o.replace('+', '')));
    let winner = 0;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (totalKills >= thresholds[i]) { winner = i; break; }
    }
    return winner;
  }

  return null;
}

async function main() {
  if (!ORACLE_PRIVATE_KEY) {
    console.error('ORACLE_PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETS_ABI, wallet);

  console.log(`[Oracle] Started with address: ${wallet.address}`);
  console.log(`[Oracle] Contract: ${CONTRACT_ADDRESS}`);
  console.log(`[Oracle] Polling every ${POLL_INTERVAL / 1000}s\n`);

  // Track resolved markets so we don't re-fetch match data
  const resolvedCache = new Set<number>();

  async function poll() {
    try {
      const result = await contract.getMarketsPage(0, 100);
      const now = Math.floor(Date.now() / 1000);

      const markets: MarketInfo[] = result.ids.map((id: bigint, i: number) => ({
        id: Number(id),
        name: result.names[i],
        outcomes: result.outcomes[i],
        oracle: result.oracles[i],
        predictionDeadline: Number(result.predictionDeadlines[i]),
        isResolved: result.isResolved[i],
        isCancelled: result.isCancelled[i],
      }));

      // Filter to unresolved markets past deadline where we are the oracle
      const pending = markets.filter(m =>
        !m.isResolved &&
        !m.isCancelled &&
        !resolvedCache.has(m.id) &&
        m.oracle.toLowerCase() === wallet.address.toLowerCase()
      );

      if (pending.length === 0) return;

      console.log(`[Oracle] ${pending.length} market(s) to check`);

      // Group by match ID to avoid duplicate API calls
      const matchIds = new Map<string, MarketInfo[]>();
      for (const market of pending) {
        const matchId = parseMatchId(market.name);
        if (!matchId) {
          console.log(`[Oracle] Skipping market ${market.id}: can't parse match ID from "${market.name}"`);
          continue;
        }
        if (!matchIds.has(matchId)) matchIds.set(matchId, []);
        matchIds.get(matchId)!.push(market);
      }

      for (const [matchId, matchMarkets] of matchIds) {
        try {
          console.log(`[Oracle] Fetching match ${matchId} from OpenDota...`);
          const matchData = await getMatchDetails(Number(matchId));

          // Check if match is actually finished (has duration)
          if (!matchData || !matchData.duration) {
            console.log(`[Oracle] Match ${matchId}: not finished yet, skipping`);
            continue;
          }

          console.log(`[Oracle] Match ${matchId}: duration=${Math.floor(matchData.duration / 60)}m, radiant_win=${matchData.radiant_win}, kills=${(matchData.radiant_score || 0) + (matchData.dire_score || 0)}`);

          for (const market of matchMarkets) {
            // Check if deadline has passed (contract requires this)
            if (now < market.predictionDeadline) {
              console.log(`[Oracle] Market ${market.id}: deadline not reached yet (${Math.floor((market.predictionDeadline - now) / 60)}m left)`);
              continue;
            }

            const question = parseQuestion(market.name);
            const outcomeIndex = determineOutcome(question, market.outcomes, matchData);

            if (outcomeIndex === null) {
              console.log(`[Oracle] Market ${market.id}: can't determine outcome for "${question}"`);
              continue;
            }

            console.log(`[Oracle] Resolving market ${market.id}: "${question}" → ${market.outcomes[outcomeIndex]} (index ${outcomeIndex})`);

            try {
              const nonce = await wallet.getNonce();
              const tx = await contract.resolveMarket(market.id, outcomeIndex, { nonce });
              await tx.wait();
              resolvedCache.add(market.id);
              console.log(`[Oracle] ✅ Market ${market.id} resolved!`);
            } catch (err: any) {
              console.error(`[Oracle] ❌ Failed to resolve market ${market.id}:`, err.message);
            }
          }
        } catch (err: any) {
          if (err.message?.includes('404') || err.message?.includes('error')) {
            console.log(`[Oracle] Match ${matchId}: not found on OpenDota (may be too recent)`);
          } else {
            console.error(`[Oracle] Error fetching match ${matchId}:`, err.message);
          }
        }
      }
    } catch (err: any) {
      console.error('[Oracle] Poll error:', err.message);
    }
  }

  // Initial poll
  await poll();

  // Loop
  setInterval(poll, POLL_INTERVAL);
}

main().catch(console.error);
