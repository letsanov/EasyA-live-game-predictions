import { ethers } from 'ethers';
import { getMatchDetails } from '../services/opendota.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
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

// Trim match data to only the fields the LLM needs
function summarizeMatchData(matchData: any): object {
  return {
    duration_seconds: matchData.duration,
    duration_minutes: Math.round((matchData.duration || 0) / 60),
    radiant_win: matchData.radiant_win,
    radiant_score: matchData.radiant_score,
    dire_score: matchData.dire_score,
    total_kills: (matchData.radiant_score || 0) + (matchData.dire_score || 0),
    first_blood_time_seconds: matchData.first_blood_time,
    first_blood_time_minutes: matchData.first_blood_time != null
      ? +(matchData.first_blood_time / 60).toFixed(1)
      : null,
    objectives: (matchData.objectives || [])
      .filter((o: any) => o.type === 'building_kill' && o.key?.includes('tower'))
      .slice(0, 5)
      .map((o: any) => ({
        type: o.type,
        key: o.key,
        time: o.time,
        team: o.player_slot < 128 ? 'radiant' : 'dire',
      })),
  };
}

async function askLLM(question: string, outcomes: string[], matchSummary: object): Promise<{ outcome: number; reasoning: string } | null> {
  const prompt = `You are a Dota 2 match oracle. Given match data and a prediction market question, determine which outcome won.

MATCH DATA:
${JSON.stringify(matchSummary, null, 2)}

QUESTION: "${question}"
OUTCOMES: ${outcomes.map((o, i) => `${i}="${o}"`).join(', ')}

Based on the match data, which outcome index won? Reply with ONLY a JSON object: {"outcome": <index>, "reasoning": "<brief explanation>"}`;

  console.log(`[Oracle/LLM] ── REQUEST ──`);
  console.log(`[Oracle/LLM] Question: "${question}"`);
  console.log(`[Oracle/LLM] Outcomes: ${outcomes.map((o, i) => `${i}="${o}"`).join(', ')}`);
  console.log(`[Oracle/LLM] Match data: ${JSON.stringify(matchSummary)}`);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    console.log(`[Oracle/LLM] ── RESPONSE: empty ──`);
    return null;
  }

  console.log(`[Oracle/LLM] ── RESPONSE ──`);
  console.log(`[Oracle/LLM] Raw: ${content}`);

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    console.log(`[Oracle/LLM] ⚠ Could not parse JSON`);
    return null;
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const outcomeIndex = parsed.outcome;

  if (typeof outcomeIndex !== 'number' || outcomeIndex < 0 || outcomeIndex >= outcomes.length) {
    console.log(`[Oracle/LLM] ⚠ Invalid outcome index: ${outcomeIndex}`);
    return null;
  }

  console.log(`[Oracle/LLM] Decision: ${outcomeIndex} = "${outcomes[outcomeIndex]}"`);
  console.log(`[Oracle/LLM] Reasoning: ${parsed.reasoning}`);
  console.log(`[Oracle/LLM] ────────────`);
  return { outcome: outcomeIndex, reasoning: parsed.reasoning };
}

async function main() {
  if (!ORACLE_PRIVATE_KEY) {
    console.error('ORACLE_PRIVATE_KEY not set in .env');
    process.exit(1);
  }
  if (!OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY not set in .env');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETS_ABI, wallet);

  console.log(`[Oracle] Started with address: ${wallet.address}`);
  console.log(`[Oracle] Contract: ${CONTRACT_ADDRESS}`);
  console.log(`[Oracle] LLM: google/gemini-2.0-flash-001 via OpenRouter`);
  console.log(`[Oracle] Polling every ${POLL_INTERVAL / 1000}s\n`);

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

          if (!matchData || !matchData.duration) {
            console.log(`[Oracle] Match ${matchId}: not finished yet, skipping`);
            continue;
          }

          const summary = summarizeMatchData(matchData);
          console.log(`[Oracle] Match ${matchId}: duration=${Math.floor(matchData.duration / 60)}m, radiant_win=${matchData.radiant_win}, kills=${(matchData.radiant_score || 0) + (matchData.dire_score || 0)}`);

          for (const market of matchMarkets) {
            if (now < market.predictionDeadline) {
              console.log(`[Oracle] Market ${market.id}: deadline not reached yet (${Math.floor((market.predictionDeadline - now) / 60)}m left)`);
              continue;
            }

            const question = parseQuestion(market.name);

            console.log(`[Oracle] Asking LLM for market ${market.id}: "${question}"`);
            const llmResult = await askLLM(question, market.outcomes, summary);

            if (llmResult === null) {
              console.log(`[Oracle] Market ${market.id}: LLM could not determine outcome`);
              continue;
            }

            const outcomeIndex = llmResult.outcome;
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

  await poll();
  setInterval(poll, POLL_INTERVAL);
}

main().catch(console.error);
