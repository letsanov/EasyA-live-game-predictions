/**
 * Oracle Backtest — replays already-resolved markets through the LLM
 * to see what it would have predicted vs what actually happened.
 *
 * Usage: npx tsx src/oracle/backtest.ts
 */
import { ethers } from 'ethers';
import { getMatchDetails } from '../services/opendota.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const RPC_URL = 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

const MARKETS_ABI = [
  "function getMarketsPage(uint256 offset, uint256 limit) external view returns (uint256 totalMarkets, uint256[] memory ids, string[] memory names, string[][] memory outcomes, address[] memory creators, address[] memory oracles, uint256[] memory predictionDeadlines, bool[] memory isResolved, bool[] memory isCancelled, uint256[] memory winningOutcomes, uint256[] memory totalPoolAmounts, uint256[] memory resolvedTimestamps, bool[] memory unclaimedWinningsCollected, uint256[] memory creationTimestamps, uint256[][] memory poolAmounts)",
];

function parseMatchId(name: string): string | null {
  const m = name.match(/\[(\d+)\]/);
  if (m) return m[1];
  const old = name.match(/^Match (\d+):/);
  return old ? old[1] : null;
}

function parseQuestion(name: string): string {
  return name.replace(/^(?:.+?\[\d+\](?:\s*\{.+?\})?|Match \d+):\s*/, '');
}

function summarizeMatchData(d: any): object {
  return {
    duration_seconds: d.duration,
    duration_minutes: Math.round((d.duration || 0) / 60),
    radiant_win: d.radiant_win,
    radiant_score: d.radiant_score,
    dire_score: d.dire_score,
    total_kills: (d.radiant_score || 0) + (d.dire_score || 0),
    first_blood_time_seconds: d.first_blood_time,
    first_blood_time_minutes: d.first_blood_time != null ? +(d.first_blood_time / 60).toFixed(1) : null,
    objectives: (d.objectives || [])
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
    console.error(`  LLM API error ${res.status}: ${text}`);
    return null;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    console.log(`  LLM raw (unparseable): ${content}`);
    return null;
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return { outcome: parsed.outcome, reasoning: parsed.reasoning };
}

async function main() {
  if (!OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY not set in .env');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETS_ABI, provider);

  console.log('═══════════════════════════════════════════════════════');
  console.log('  ORACLE BACKTEST — LLM vs On-Chain Resolution');
  console.log('  Model: google/gemini-2.0-flash-001 via OpenRouter');
  console.log('═══════════════════════════════════════════════════════\n');

  const result = await contract.getMarketsPage(0, 100);

  // Find resolved markets
  const resolved: { id: number; name: string; outcomes: string[]; winningOutcome: number }[] = [];
  for (let i = 0; i < result.ids.length; i++) {
    if (result.isResolved[i] && !result.isCancelled[i]) {
      resolved.push({
        id: Number(result.ids[i]),
        name: result.names[i],
        outcomes: result.outcomes[i],
        winningOutcome: Number(result.winningOutcomes[i]),
      });
    }
  }

  if (resolved.length === 0) {
    console.log('No resolved markets found on-chain. Nothing to backtest.');
    return;
  }

  console.log(`Found ${resolved.length} resolved market(s) to backtest.\n`);

  // Group by match ID
  const byMatch = new Map<string, typeof resolved>();
  for (const m of resolved) {
    const matchId = parseMatchId(m.name);
    if (!matchId) continue;
    if (!byMatch.has(matchId)) byMatch.set(matchId, []);
    byMatch.get(matchId)!.push(m);
  }

  let correct = 0;
  let total = 0;

  for (const [matchId, markets] of byMatch) {
    console.log(`┌─ Match ${matchId}`);
    console.log('│');

    let matchData: any;
    try {
      matchData = await getMatchDetails(Number(matchId));
    } catch {
      console.log('│  ⚠ Could not fetch from OpenDota, skipping');
      console.log('└────────────────────────────────────\n');
      continue;
    }

    if (!matchData?.duration) {
      console.log('│  ⚠ No match data / not finished');
      console.log('└────────────────────────────────────\n');
      continue;
    }

    const summary = summarizeMatchData(matchData);

    console.log('│  RAW MATCH DATA:');
    console.log(`│    Duration:     ${Math.floor(matchData.duration / 60)}m ${matchData.duration % 60}s`);
    console.log(`│    Winner:       ${matchData.radiant_win ? 'Radiant' : 'Dire'}`);
    console.log(`│    Score:        Radiant ${matchData.radiant_score} - Dire ${matchData.dire_score} (${(matchData.radiant_score || 0) + (matchData.dire_score || 0)} total)`);
    console.log(`│    First Blood:  ${matchData.first_blood_time != null ? `${(matchData.first_blood_time / 60).toFixed(1)}m` : 'N/A'}`);
    const towers = (matchData.objectives || []).filter((o: any) => o.type === 'building_kill' && o.key?.includes('tower'));
    if (towers.length > 0) {
      const first = towers[0];
      console.log(`│    First Tower:  ${first.player_slot < 128 ? 'Radiant' : 'Dire'} at ${(first.time / 60).toFixed(1)}m (${first.key})`);
    }
    console.log('│');

    for (const market of markets) {
      const question = parseQuestion(market.name);
      const onChainWinner = market.outcomes[market.winningOutcome];

      console.log(`│  ┌─ Market #${market.id}: "${question}"`);
      console.log(`│  │  Outcomes: ${market.outcomes.map((o, i) => `${i}="${o}"`).join(', ')}`);
      console.log(`│  │  On-chain result: ${market.winningOutcome} = "${onChainWinner}"`);

      const llmResult = await askLLM(question, market.outcomes, summary);

      if (llmResult === null) {
        console.log(`│  │  LLM: ❌ FAILED to produce answer`);
      } else {
        const llmWinner = market.outcomes[llmResult.outcome];
        const match = llmResult.outcome === market.winningOutcome;
        total++;
        if (match) correct++;

        console.log(`│  │  LLM answer:   ${llmResult.outcome} = "${llmWinner}"`);
        console.log(`│  │  LLM reasoning: ${llmResult.reasoning}`);
        console.log(`│  │  ${match ? '✅ CORRECT' : '❌ WRONG'}`);
      }
      console.log('│  └────');
    }

    console.log('└────────────────────────────────────\n');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${correct}/${total} correct (${total > 0 ? Math.round((correct / total) * 100) : 0}%)`);
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(console.error);
