import { useWallet } from '@/contexts/WalletContext';
import { Contract, MaxUint256 } from 'ethers';
import { network } from '@/config/networks';

// Markets.sol ABI (only the functions we need)
const MARKETS_ABI = [
  "function createMarketWithSeed(string memory name, string[] memory outcomes, uint256 predictionDuration, address oracle, uint256 seedOutcomeIndex, uint256 seedAmount) external returns (uint256)",
  "function getMarketDetails(uint256 marketId) external view returns (string memory name, string[] memory outcomes, address creator, address oracle, uint256 predictionDeadline, bool isResolved, bool isCancelled, uint256 winningOutcome, uint256 totalPoolAmount, uint256 resolvedTimestamp, bool unclaimedWinningsCollected, uint256 creationTimestamp)",
  "function getMarketsPage(uint256 offset, uint256 limit) external view returns (uint256 totalMarkets, uint256[] memory ids, string[] memory names, string[][] memory outcomes, address[] memory creators, address[] memory oracles, uint256[] memory predictionDeadlines, bool[] memory isResolved, bool[] memory isCancelled, uint256[] memory winningOutcomes, uint256[] memory totalPoolAmounts, uint256[] memory resolvedTimestamps, bool[] memory unclaimedWinningsCollected, uint256[] memory creationTimestamps, uint256[][] memory poolAmounts)",
  "function getPoolAmount(uint256 marketId, uint256 outcomeIndex) external view returns (uint256)",
  "function getUserPrediction(uint256 marketId, uint256 outcomeIndex, address user) external view returns (uint256)",
  "function hasClaimed(address user, uint256 marketId) external view returns (bool)",
  "function makePrediction(uint256 marketId, uint256 outcomeIndex, uint256 amount) external",
  "function claimPayout(uint256 marketId) external",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

export function useMarketContract() {
  const { signer, provider, account } = useWallet();

  const ensureCorrectChain = async () => {
    if (!provider) throw new Error('No provider');
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== network.chainId) {
      throw new Error(`Wrong network — please switch to ${network.chainId === 8453 ? 'Base' : 'chain ' + network.chainId} in MetaMask`);
    }
  };

  const getContract = () => {
    if (!signer) throw new Error('Wallet not connected');
    return new Contract(network.contractAddress, MARKETS_ABI, signer);
  };

  const getUSDC = () => {
    if (!signer) throw new Error('Wallet not connected');
    return new Contract(network.usdcAddress, ERC20_ABI, signer);
  };

  const ensureApproval = async (amount: bigint) => {
    if (!account) throw new Error('Wallet not connected');
    await ensureCorrectChain();
    const usdc = getUSDC();
    console.log('Checking allowance for', account, 'spender:', network.contractAddress, 'USDC at:', network.usdcAddress);
    const allowance = await usdc.allowance(account, network.contractAddress);
    console.log('Current allowance:', allowance.toString(), 'needed:', amount.toString());
    if (allowance < amount) {
      console.log('Requesting USDC approval...');
      const tx = await usdc.approve(network.contractAddress, MaxUint256);
      console.log('Approve TX sent:', tx.hash);
      await tx.wait();
      console.log('Approve TX confirmed');
    } else {
      console.log('Already approved');
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
    const contract = new Contract(network.contractAddress, MARKETS_ABI, provider);
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

  const getUserPrediction = async (marketId: number, outcomeIndex: number, user: string) => {
    if (!provider) return BigInt(0);
    const contract = new Contract(network.contractAddress, MARKETS_ABI, provider);
    return await contract.getUserPrediction(marketId, outcomeIndex, user);
  };

  const hasClaimed = async (user: string, marketId: number): Promise<boolean> => {
    if (!provider) return false;
    const contract = new Contract(network.contractAddress, MARKETS_ABI, provider);
    return await contract.hasClaimed(user, marketId);
  };

  const getUSDCBalance = async () => {
    if (!account || !provider) return BigInt(0);
    const usdc = new Contract(network.usdcAddress, ERC20_ABI, provider);
    return await usdc.balanceOf(account);
  };

  return {
    createMarket,
    getMarketsPage,
    makePrediction,
    claimPayout,
    getUserPrediction,
    hasClaimed,
    getUSDCBalance,
    isConnected: !!account,
  };
}
