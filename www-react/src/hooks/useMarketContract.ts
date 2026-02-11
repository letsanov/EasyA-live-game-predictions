import { useWallet } from '@/contexts/WalletContext';
import { Contract, MaxUint256 } from 'ethers';

// Markets.sol ABI (only the functions we need)
const MARKETS_ABI = [
  "function createMarketWithSeed(string memory name, string[] memory outcomes, uint256 predictionDuration, address oracle, uint256 seedOutcomeIndex, uint256 seedAmount) external returns (uint256)",
  "function getMarketDetails(uint256 marketId) external view returns (string memory name, string[] memory outcomes, address creator, address oracle, uint256 predictionDeadline, bool isResolved, bool isCancelled, uint256 winningOutcome, uint256 totalPoolAmount, uint256 resolvedTimestamp, bool unclaimedWinningsCollected, uint256 creationTimestamp)",
  "function getMarketsPage(uint256 offset, uint256 limit) external view returns (uint256 totalMarkets, uint256[] memory ids, string[] memory names, string[][] memory outcomes, address[] memory creators, address[] memory oracles, uint256[] memory predictionDeadlines, bool[] memory isResolved, bool[] memory isCancelled, uint256[] memory winningOutcomes, uint256[] memory totalPoolAmounts, uint256[] memory resolvedTimestamps, bool[] memory unclaimedWinningsCollected, uint256[] memory creationTimestamps, uint256[][] memory poolAmounts)",
  "function getPoolAmount(uint256 marketId, uint256 outcomeIndex) external view returns (uint256)",
  "function makePrediction(uint256 marketId, uint256 outcomeIndex, uint256 amount) external",
  "function claimPayout(uint256 marketId) external",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

const CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const USDC_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export function useMarketContract() {
  const { signer, provider, account } = useWallet();

  const getContract = () => {
    if (!signer) throw new Error('Wallet not connected');
    return new Contract(CONTRACT_ADDRESS, MARKETS_ABI, signer);
  };

  const getUSDC = () => {
    if (!signer) throw new Error('Wallet not connected');
    return new Contract(USDC_ADDRESS, ERC20_ABI, signer);
  };

  const ensureApproval = async (amount: bigint) => {
    if (!account) throw new Error('Wallet not connected');
    const usdc = getUSDC();
    const allowance = await usdc.allowance(account, CONTRACT_ADDRESS);
    if (allowance < amount) {
      const tx = await usdc.approve(CONTRACT_ADDRESS, MaxUint256);
      await tx.wait();
    }
  };

  const createMarket = async (
    name: string,
    outcomes: string[],
    predictionDuration: number,
    oracle: string,
    seedAmount: bigint
  ) => {
    console.log('Creating market:', name, 'with seed:', seedAmount.toString());
    await ensureApproval(seedAmount);
    console.log('USDC approved');

    const contract = getContract();
    const tx = await contract.createMarketWithSeed(
      name,
      outcomes,
      predictionDuration,
      oracle,
      0, // seed first outcome
      seedAmount
    );
    console.log('TX sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('TX mined, logs:', receipt.logs.length);

    // Try to find MarketCreated event
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'MarketCreated') {
          console.log('Market created with ID:', Number(parsed.args.marketId));
          return Number(parsed.args.marketId);
        }
      } catch {
        // Not our event (e.g. ERC20 Transfer), skip
      }
    }

    // TX succeeded but couldn't parse event - still ok
    console.warn('Market TX succeeded but MarketCreated event not parsed');
    return -1;
  };

  const getMarketsPage = async (offset: number, limit: number) => {
    if (!provider) throw new Error('No provider');
    // Use provider (not signer) for read-only calls
    const contract = new Contract(CONTRACT_ADDRESS, MARKETS_ABI, provider);
    const result = await contract.getMarketsPage(offset, limit);

    return {
      totalMarkets: Number(result.totalMarkets),
      markets: result.ids.map((id: bigint, i: number) => ({
        id: Number(id),
        name: result.names[i],
        outcomes: result.outcomes[i],
        creator: result.creators[i],
        oracle: result.oracles[i],
        predictionDeadline: Number(result.predictionDeadlines[i]),
        isResolved: result.isResolved[i],
        isCancelled: result.isCancelled[i],
        winningOutcome: Number(result.winningOutcomes[i]),
        totalPoolAmount: result.totalPoolAmounts[i],
        poolAmounts: result.poolAmounts[i].map((amt: bigint) => amt),
        creationTimestamp: Number(result.creationTimestamps[i]),
      })),
    };
  };

  const makePrediction = async (marketId: number, outcomeIndex: number, amount: bigint) => {
    await ensureApproval(amount);
    const contract = getContract();
    const tx = await contract.makePrediction(marketId, outcomeIndex, amount);
    await tx.wait();
  };

  const claimPayout = async (marketId: number) => {
    const contract = getContract();
    const tx = await contract.claimPayout(marketId);
    await tx.wait();
  };

  const getUSDCBalance = async () => {
    if (!account || !provider) return BigInt(0);
    const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, provider);
    return await usdc.balanceOf(account);
  };

  return {
    createMarket,
    getMarketsPage,
    makePrediction,
    claimPayout,
    getUSDCBalance,
    isConnected: !!account,
  };
}
