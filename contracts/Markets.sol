// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
 * Markets
 * Smart contract for live game prediction markets with USDC payments
 * V2.0.0 - USDC Payment Support
 */

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Markets is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    // ========== CONSTANTS ==========

    string public constant VERSION = "2.0.0";

    // Maximum number of outcomes per market
    uint256 public constant MAX_OUTCOMES = 64;

    // 10 years in seconds (10 * 365 * 24 * 60 * 60)
    uint256 public constant UNCLAIMED_TIMEOUT = 315360000;

    // Cancellation grace period: 5 minutes
    uint256 public constant CANCELLATION_GRACE_PERIOD = 300;

    // Minimum time before deadline to allow cancellation: 10 minutes
    uint256 public constant MIN_TIME_BEFORE_DEADLINE = 600;

    // Fee constants (in basis points, where 100 = 1%)
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%
    uint256 public constant CREATOR_FEE_BPS = 100; // 1%

    // ========== STRUCTS ==========

    struct Market {
        uint256 id;
        string name;
        string[] outcomes;
        mapping(uint256 => uint256) poolAmounts;
        mapping(uint256 => mapping(address => uint256)) userPredictions;
        mapping(uint256 => address[]) poolParticipants;
        address creator;
        address oracle;
        uint256 predictionDeadline;
        uint256 winningOutcome;
        bool isResolved;
        bool isCancelled;
        uint256 totalPoolAmount;
        uint256 resolvedTimestamp;
        bool unclaimedWinningsCollected;
        uint256 creationTimestamp;
    }

    // ========== STATE VARIABLES ==========

    IERC20 public paymentToken; // USDC token address

    mapping(uint256 => Market) public markets;
    uint256 public nextMarketId;
    uint256 public platformFeeBalance;
    mapping(address => uint256) public creatorFeeBalances;
    mapping(address => uint256) public totalCreatorFeesEarned;

    // Track claimed payouts per user per market
    mapping(address => mapping(uint256 => bool)) public hasClaimed;
    mapping(address => mapping(uint256 => uint256)) public claimedAmount;

    // Trusted oracles registry
    mapping(address => bool) public trustedOracles;
    address[] public trustedOracleList;

    // ========== EVENTS ==========

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string name,
        string[] outcomes,
        uint256 predictionDeadline,
        address oracle
    );

    event PredictionPlaced(
        uint256 indexed marketId,
        address indexed predictor,
        uint256 outcomeIndex,
        uint256 amount,
        uint256 totalPoolAmount,
        uint256[] poolAmounts
    );

    event MarketResolved(
        uint256 indexed marketId,
        uint256 winningOutcome
    );

    event MarketCancelled(
        uint256 indexed marketId,
        address indexed canceller,
        string reason
    );

    event PayoutClaimed(
        uint256 indexed marketId,
        address indexed winner,
        uint256 amount
    );

    event PlatformFeeCollected(
        uint256 indexed marketId,
        uint256 platformFeeAmount,
        uint256 creatorFeeAmount
    );

    event PlatformFeeWithdrawn(
        address indexed owner,
        uint256 amount
    );

    event CreatorFeeWithdrawn(
        address indexed creator,
        uint256 amount
    );

    event UnclaimedWinningsCollected(
        uint256 indexed marketId,
        address indexed owner,
        uint256 amount
    );

    event TrustedOracleAdded(
        address indexed oracle
    );

    event TrustedOracleRemoved(
        address indexed oracle
    );

    // ========== CONSTRUCTOR ==========

    /**
     * @notice Initialize the contract with USDC token address
     * @param _paymentToken Address of the USDC ERC20 token
     */
    constructor(address _paymentToken) {
        require(_paymentToken != address(0), "Payment token address cannot be zero");
        paymentToken = IERC20(_paymentToken);
    }

    // ========== MODIFIERS ==========

    modifier onlyMarketCreator(uint256 marketId) {
        require(markets[marketId].creator == msg.sender, "Only market creator can call this");
        _;
    }

    modifier onlyMarketOracle(uint256 marketId) {
        require(markets[marketId].oracle == msg.sender, "Only market oracle can call this");
        _;
    }

    modifier marketExists(uint256 marketId) {
        require(marketId < nextMarketId, "Market does not exist");
        _;
    }

    modifier predictionOpen(uint256 marketId) {
        require(block.timestamp < markets[marketId].predictionDeadline, "Prediction period has ended");
        require(!markets[marketId].isResolved, "Market already resolved");
        require(!markets[marketId].isCancelled, "Market has been cancelled");
        _;
    }

    modifier marketNotCancelled(uint256 marketId) {
        require(!markets[marketId].isCancelled, "Market has been cancelled");
        _;
    }

    modifier marketResolved(uint256 marketId) {
        require(markets[marketId].isResolved, "Market not resolved yet");
        _;
    }

    // ========== TRUSTED ORACLE FUNCTIONS ==========

    /**
     * @notice Add a trusted oracle address
     * @param oracle Address to add as trusted oracle
     */
    function addTrustedOracle(address oracle) external onlyOwner {
        require(oracle != address(0), "Invalid oracle address");
        require(!trustedOracles[oracle], "Oracle already trusted");

        trustedOracles[oracle] = true;
        trustedOracleList.push(oracle);

        emit TrustedOracleAdded(oracle);
    }

    /**
     * @notice Remove a trusted oracle address
     * @param oracle Address to remove from trusted oracles
     */
    function removeTrustedOracle(address oracle) external onlyOwner {
        require(trustedOracles[oracle], "Oracle not trusted");

        trustedOracles[oracle] = false;

        // Remove from list
        for (uint256 i = 0; i < trustedOracleList.length; i++) {
            if (trustedOracleList[i] == oracle) {
                trustedOracleList[i] = trustedOracleList[trustedOracleList.length - 1];
                trustedOracleList.pop();
                break;
            }
        }

        emit TrustedOracleRemoved(oracle);
    }

    /**
     * @notice Check if an address is a trusted oracle
     * @param oracle Address to check
     * @return bool True if oracle is trusted
     */
    function isTrustedOracle(address oracle) external view returns (bool) {
        return trustedOracles[oracle];
    }

    /**
     * @notice Get all trusted oracles
     * @return address[] Array of trusted oracle addresses
     */
    function getTrustedOracles() external view returns (address[] memory) {
        return trustedOracleList;
    }

    // ========== CORE FUNCTIONS ==========

    /**
     * @notice Create a new prediction market
     * @param name The question or name of the market
     * @param outcomes Array of possible outcomes
     * @param predictionDuration Duration in seconds until predictions close
     * @param oracle Address that will resolve the market (cannot be address(0))
     * @return uint256 The ID of the created market
     */
    function createMarket(
        string memory name,
        string[] memory outcomes,
        uint256 predictionDuration,
        address oracle
    ) external returns (uint256) {
        require(outcomes.length >= 2, "Must have at least 2 outcomes");
        require(outcomes.length <= MAX_OUTCOMES, "Too many outcomes");
        require(predictionDuration > 0, "Prediction duration must be positive");
        require(oracle != address(0), "Oracle address cannot be zero");

        uint256 marketId = nextMarketId++;
        Market storage newMarket = markets[marketId];

        newMarket.id = marketId;
        newMarket.name = name;
        newMarket.outcomes = outcomes;
        newMarket.creator = msg.sender;
        newMarket.oracle = oracle;
        newMarket.predictionDeadline = block.timestamp + predictionDuration;
        newMarket.isResolved = false;
        newMarket.isCancelled = false;
        newMarket.totalPoolAmount = 0;
        newMarket.creationTimestamp = block.timestamp;

        emit MarketCreated(marketId, msg.sender, name, outcomes, newMarket.predictionDeadline, oracle);

        return marketId;
    }

    /**
     * @notice Place a prediction on an outcome
     * @param marketId The ID of the market
     * @param outcomeIndex The index of the outcome to bet on
     * @param amount The amount of USDC to bet (in USDC units, 6 decimals)
     */
    function makePrediction(uint256 marketId, uint256 outcomeIndex, uint256 amount)
        external
        marketExists(marketId)
        predictionOpen(marketId)
        nonReentrant
    {
        require(amount > 0, "Prediction amount must be greater than 0");
        require(outcomeIndex < markets[marketId].outcomes.length, "Invalid outcome index");

        Market storage marketData = markets[marketId];

        // Transfer USDC from user to contract
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        if (marketData.userPredictions[outcomeIndex][msg.sender] == 0) {
            marketData.poolParticipants[outcomeIndex].push(msg.sender);
        }

        marketData.userPredictions[outcomeIndex][msg.sender] += amount;
        marketData.poolAmounts[outcomeIndex] += amount;
        marketData.totalPoolAmount += amount;

        // Build poolAmounts array for emission
        uint256[] memory poolAmountsArray = new uint256[](marketData.outcomes.length);
        for (uint256 i = 0; i < marketData.outcomes.length; i++) {
            poolAmountsArray[i] = marketData.poolAmounts[i];
        }

        emit PredictionPlaced(marketId, msg.sender, outcomeIndex, amount, marketData.totalPoolAmount, poolAmountsArray);
    }

    /**
     * @notice Create a new market and immediately place a seed bet on an outcome
     * @param name The question or name of the market
     * @param outcomes Array of possible outcomes
     * @param predictionDuration Duration in seconds until predictions close
     * @param oracle Address that will resolve the market (cannot be address(0))
     * @param seedOutcomeIndex The outcome to place the initial bet on
     * @param seedAmount The amount of USDC to bet (in USDC units, 6 decimals)
     * @return uint256 The ID of the created market
     */
    function createMarketWithSeed(
        string memory name,
        string[] memory outcomes,
        uint256 predictionDuration,
        address oracle,
        uint256 seedOutcomeIndex,
        uint256 seedAmount
    ) external nonReentrant returns (uint256) {
        require(outcomes.length >= 2, "Must have at least 2 outcomes");
        require(outcomes.length <= MAX_OUTCOMES, "Too many outcomes");
        require(predictionDuration > 0, "Prediction duration must be positive");
        require(oracle != address(0), "Oracle address cannot be zero");
        require(seedAmount > 0, "Seed amount must be greater than 0");
        require(seedOutcomeIndex < outcomes.length, "Invalid seed outcome index");

        // Transfer USDC from user to contract
        paymentToken.safeTransferFrom(msg.sender, address(this), seedAmount);

        // Create the market
        uint256 marketId = nextMarketId++;
        Market storage newMarket = markets[marketId];

        newMarket.id = marketId;
        newMarket.name = name;
        newMarket.outcomes = outcomes;
        newMarket.creator = msg.sender;
        newMarket.oracle = oracle;
        newMarket.predictionDeadline = block.timestamp + predictionDuration;
        newMarket.isResolved = false;
        newMarket.isCancelled = false;
        newMarket.totalPoolAmount = 0;
        newMarket.creationTimestamp = block.timestamp;

        emit MarketCreated(marketId, msg.sender, name, outcomes, newMarket.predictionDeadline, oracle);

        // Place the seed bet immediately
        if (newMarket.userPredictions[seedOutcomeIndex][msg.sender] == 0) {
            newMarket.poolParticipants[seedOutcomeIndex].push(msg.sender);
        }

        newMarket.userPredictions[seedOutcomeIndex][msg.sender] += seedAmount;
        newMarket.poolAmounts[seedOutcomeIndex] += seedAmount;
        newMarket.totalPoolAmount += seedAmount;

        // Build poolAmounts array for emission
        uint256[] memory poolAmountsArray = new uint256[](outcomes.length);
        for (uint256 i = 0; i < outcomes.length; i++) {
            poolAmountsArray[i] = newMarket.poolAmounts[i];
        }

        emit PredictionPlaced(marketId, msg.sender, seedOutcomeIndex, seedAmount, newMarket.totalPoolAmount, poolAmountsArray);

        return marketId;
    }

    /**
     * @dev Check if a market has bets from addresses other than the creator
     * @param marketId The ID of the market
     * @return bool True if there are external bets
     */
    function _hasExternalBets(uint256 marketId) private view returns (bool) {
        Market storage marketData = markets[marketId];

        // Check each outcome for non-creator participants
        for (uint256 i = 0; i < marketData.outcomes.length; i++) {
            address[] memory participants = marketData.poolParticipants[i];
            for (uint256 j = 0; j < participants.length; j++) {
                if (participants[j] != marketData.creator) {
                    return true; // Found a non-creator bet
                }
            }
        }

        return false; // Only creator has bet (or no bets at all)
    }

    /**
     * @notice Cancel a market (only by creator with restrictions)
     * @param marketId The ID of the market to cancel
     *
     * Cancellation rules:
     * - Cannot cancel if deadline is less than 10 minutes away
     * - Can cancel if no external bets exist
     * - Can cancel within first 5 minutes even if external bets exist
     */
    function cancelMarket(uint256 marketId)
        external
        marketExists(marketId)
        onlyMarketCreator(marketId)
        marketNotCancelled(marketId)
        nonReentrant
    {
        require(!markets[marketId].isResolved, "Cannot cancel resolved market");

        Market storage marketData = markets[marketId];

        // Rule 1: Cannot cancel if deadline is less than 10 minutes away
        require(
            block.timestamp + MIN_TIME_BEFORE_DEADLINE <= marketData.predictionDeadline,
            "Cannot cancel: market closes in less than 10 minutes"
        );

        // Rule 2 & 3: Check if cancellation is allowed based on bets and time
        bool hasExternalBets = _hasExternalBets(marketId);
        bool inGracePeriod = block.timestamp < marketData.creationTimestamp + CANCELLATION_GRACE_PERIOD;

        require(
            !hasExternalBets || inGracePeriod,
            "Cannot cancel: grace period ended and others have bet"
        );

        marketData.isCancelled = true;

        emit MarketCancelled(marketId, msg.sender, "Cancelled by creator");
    }

    /**
     * @notice Resolve a market with a winning outcome
     * @param marketId The ID of the market to resolve
     * @param winningOutcomeIndex The index of the winning outcome
     */
    function resolveMarket(uint256 marketId, uint256 winningOutcomeIndex)
        external
        marketExists(marketId)
        onlyMarketOracle(marketId)
        marketNotCancelled(marketId)
    {
        require(!markets[marketId].isResolved, "Market already resolved");
        require(block.timestamp >= markets[marketId].predictionDeadline, "Prediction period not ended");
        require(winningOutcomeIndex < markets[marketId].outcomes.length, "Invalid winning outcome");

        Market storage marketData = markets[marketId];

        // Check if only one outcome has bets (single-position check)
        uint256 outcomesWithBets = 0;
        for (uint256 i = 0; i < marketData.outcomes.length; i++) {
            if (marketData.poolAmounts[i] > 0) {
                outcomesWithBets++;
            }
        }

        // If only 1 or 0 outcomes have bets, auto-cancel (refund)
        if (outcomesWithBets <= 1) {
            marketData.isCancelled = true;
            emit MarketCancelled(marketId, msg.sender, "Single-position auto-refund");
            return;
        }

        // Always collect fees on resolution (fees not collected only on cancelled markets)
        uint256 totalFee = 0;
        uint256 platformFee = 0;
        uint256 creatorFee = 0;

        // Always charge fees on resolved markets (not cancelled)
        if (marketData.totalPoolAmount > 0) {
            // Calculate fees using constants (basis points)
            platformFee = (marketData.totalPoolAmount * PLATFORM_FEE_BPS) / 10000;
            creatorFee = (marketData.totalPoolAmount * CREATOR_FEE_BPS) / 10000;
            totalFee = platformFee + creatorFee;

            platformFeeBalance += platformFee;
            creatorFeeBalances[marketData.creator] += creatorFee;
            totalCreatorFeesEarned[marketData.creator] += creatorFee;

            // Reduce total pool amount by total fee
            marketData.totalPoolAmount -= totalFee;
        }

        marketData.winningOutcome = winningOutcomeIndex;
        marketData.isResolved = true;
        marketData.resolvedTimestamp = block.timestamp;

        emit MarketResolved(marketId, winningOutcomeIndex);
        emit PlatformFeeCollected(marketId, platformFee, creatorFee);
    }

    /**
     * @notice Claim payout for a resolved market or refund for cancelled market
     * @param marketId The ID of the market
     */
    function claimPayout(uint256 marketId)
        external
        marketExists(marketId)
        nonReentrant
    {
        Market storage marketData = markets[marketId];

        // Handle refunds for cancelled markets
        if (marketData.isCancelled) {
            _claimRefund(marketId, marketData);
            return;
        }

        // Handle normal payouts for resolved markets
        require(marketData.isResolved, "Market not resolved yet");
        _claimWinnings(marketId, marketData);
    }

    /**
     * @dev Internal function to process refunds for cancelled markets
     */
    function _claimRefund(uint256 marketId, Market storage marketData) private {
        require(!hasClaimed[msg.sender][marketId], "Already claimed refund");

        uint256 totalRefund = 0;

        // Calculate total refund across all outcomes for this user
        for (uint256 i = 0; i < marketData.outcomes.length; i++) {
            uint256 userPrediction = marketData.userPredictions[i][msg.sender];
            if (userPrediction > 0) {
                totalRefund += userPrediction;
                marketData.userPredictions[i][msg.sender] = 0;
            }
        }

        require(totalRefund > 0, "No refund available");
        require(paymentToken.balanceOf(address(this)) >= totalRefund, "Insufficient contract balance");

        // Mark as claimed
        hasClaimed[msg.sender][marketId] = true;
        claimedAmount[msg.sender][marketId] = totalRefund;

        // Transfer USDC back to user
        paymentToken.safeTransfer(msg.sender, totalRefund);

        emit PayoutClaimed(marketId, msg.sender, totalRefund);
    }

    /**
     * @dev Internal function to process winnings for resolved markets
     */
    function _claimWinnings(uint256 marketId, Market storage marketData) private {
        require(!hasClaimed[msg.sender][marketId], "Already claimed payout");

        uint256 winningOutcome = marketData.winningOutcome;
        uint256 winningPoolAmount = marketData.poolAmounts[winningOutcome];
        uint256 totalPoolAmount = marketData.totalPoolAmount;

        uint256 payout = 0;

        // Special case: If winning outcome has no bets, creator can claim entire pool
        if (winningPoolAmount == 0) {
            require(msg.sender == marketData.creator, "Only creator can claim when no bets on winning outcome");
            require(totalPoolAmount > 0, "No pool to claim");

            payout = totalPoolAmount;
            marketData.totalPoolAmount = 0;
        } else {
            // Normal case: Winners claim proportionally
            uint256 userPrediction = marketData.userPredictions[winningOutcome][msg.sender];
            require(userPrediction > 0, "No winning prediction found");

            marketData.userPredictions[winningOutcome][msg.sender] = 0;
            payout = (userPrediction * totalPoolAmount) / winningPoolAmount;

            require(payout > 0, "No payout available");
        }

        require(paymentToken.balanceOf(address(this)) >= payout, "Insufficient contract balance");

        // Mark as claimed
        hasClaimed[msg.sender][marketId] = true;
        claimedAmount[msg.sender][marketId] = payout;

        // Transfer USDC to winner
        paymentToken.safeTransfer(msg.sender, payout);

        emit PayoutClaimed(marketId, msg.sender, payout);
    }

    /**
     * @notice Collect unclaimed winnings after 10 years
     * @param marketId The ID of the market
     */
    function collectUnclaimedWinnings(uint256 marketId)
        external
        onlyOwner
        marketExists(marketId)
        marketResolved(marketId)
        nonReentrant
    {
        Market storage marketData = markets[marketId];

        require(!marketData.unclaimedWinningsCollected, "Unclaimed winnings already collected");
        require(
            block.timestamp >= marketData.resolvedTimestamp + UNCLAIMED_TIMEOUT,
            "Must wait 10 years after market resolution"
        );

        uint256 winningOutcome = marketData.winningOutcome;
        uint256 totalPoolAmount = marketData.totalPoolAmount;

        // If nobody won (no predictions on winning outcome), collect entire pool
        if (marketData.poolAmounts[winningOutcome] == 0) {
            require(totalPoolAmount > 0, "No unclaimed winnings available");

            marketData.unclaimedWinningsCollected = true;

            paymentToken.safeTransfer(owner(), totalPoolAmount);

            emit UnclaimedWinningsCollected(marketId, owner(), totalPoolAmount);
            return;
        }

        // Calculate unclaimed amount by checking remaining user predictions
        uint256 unclaimedAmount = 0;
        address[] memory participants = marketData.poolParticipants[winningOutcome];

        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            uint256 userPrediction = marketData.userPredictions[winningOutcome][participant];

            // If user still has prediction amount > 0, they haven't claimed
            if (userPrediction > 0) {
                // Calculate what they would be entitled to claim
                uint256 userPayout = (userPrediction * totalPoolAmount) / marketData.poolAmounts[winningOutcome];
                unclaimedAmount += userPayout;

                // Clear their prediction so it can't be claimed later
                marketData.userPredictions[winningOutcome][participant] = 0;
            }
        }

        require(unclaimedAmount > 0, "No unclaimed winnings available");
        require(paymentToken.balanceOf(address(this)) >= unclaimedAmount, "Insufficient contract balance");

        marketData.unclaimedWinningsCollected = true;

        paymentToken.safeTransfer(owner(), unclaimedAmount);

        emit UnclaimedWinningsCollected(marketId, owner(), unclaimedAmount);
    }

    // ========== FEE WITHDRAWAL FUNCTIONS ==========

    /**
     * @notice Withdraw accumulated platform fees
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 amount = platformFeeBalance;
        require(amount > 0, "No platform fees to withdraw");

        platformFeeBalance = 0;

        paymentToken.safeTransfer(owner(), amount);

        emit PlatformFeeWithdrawn(owner(), amount);
    }

    /**
     * @notice Withdraw accumulated creator fees
     */
    function withdrawCreatorFees() external nonReentrant {
        uint256 amount = creatorFeeBalances[msg.sender];
        require(amount > 0, "No creator fees to withdraw");

        creatorFeeBalances[msg.sender] = 0;

        paymentToken.safeTransfer(msg.sender, amount);

        emit CreatorFeeWithdrawn(msg.sender, amount);
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Get detailed information about a market
     * @param marketId The ID of the market
     * @return name Market name
     * @return outcomes Array of outcome strings
     * @return creator Creator address
     * @return oracle Oracle address
     * @return predictionDeadline Prediction deadline timestamp
     * @return isResolved Whether market is resolved
     * @return isCancelled Whether market is cancelled
     * @return winningOutcome Index of winning outcome
     * @return totalPoolAmount Total pool amount
     * @return resolvedTimestamp When market was resolved
     * @return unclaimedWinningsCollected Whether unclaimed winnings were collected
     * @return creationTimestamp When market was created
     */
    function getMarketDetails(uint256 marketId)
        external
        view
        marketExists(marketId)
        returns (
            string memory name,
            string[] memory outcomes,
            address creator,
            address oracle,
            uint256 predictionDeadline,
            bool isResolved,
            bool isCancelled,
            uint256 winningOutcome,
            uint256 totalPoolAmount,
            uint256 resolvedTimestamp,
            bool unclaimedWinningsCollected,
            uint256 creationTimestamp
        )
    {
        Market storage marketData = markets[marketId];
        return (
            marketData.name,
            marketData.outcomes,
            marketData.creator,
            marketData.oracle,
            marketData.predictionDeadline,
            marketData.isResolved,
            marketData.isCancelled,
            marketData.winningOutcome,
            marketData.totalPoolAmount,
            marketData.resolvedTimestamp,
            marketData.unclaimedWinningsCollected,
            marketData.creationTimestamp
        );
    }

    /**
     * @notice Get pool amount for a specific outcome
     * @param marketId The ID of the market
     * @param outcomeIndex The index of the outcome
     * @return uint256 Pool amount for the outcome
     */
    function getPoolAmount(uint256 marketId, uint256 outcomeIndex)
        external
        view
        marketExists(marketId)
        returns (uint256)
    {
        require(outcomeIndex < markets[marketId].outcomes.length, "Invalid outcome index");
        return markets[marketId].poolAmounts[outcomeIndex];
    }

    /**
     * @notice Get user's prediction for a specific outcome
     * @param marketId The ID of the market
     * @param outcomeIndex The index of the outcome
     * @param user User address
     * @return uint256 User's prediction amount
     */
    function getUserPrediction(uint256 marketId, uint256 outcomeIndex, address user)
        external
        view
        marketExists(marketId)
        returns (uint256)
    {
        require(outcomeIndex < markets[marketId].outcomes.length, "Invalid outcome index");
        return markets[marketId].userPredictions[outcomeIndex][user];
    }

    /**
     * @notice Get all participants for a specific outcome
     * @param marketId The ID of the market
     * @param outcomeIndex The index of the outcome
     * @return address[] Array of participant addresses
     */
    function getPoolParticipants(uint256 marketId, uint256 outcomeIndex)
        external
        view
        marketExists(marketId)
        returns (address[] memory)
    {
        require(outcomeIndex < markets[marketId].outcomes.length, "Invalid outcome index");
        return markets[marketId].poolParticipants[outcomeIndex];
    }

    /**
     * @notice Get platform fee balance
     * @return uint256 Platform fee balance
     */
    function getPlatformFeeBalance() external view returns (uint256) {
        return platformFeeBalance;
    }

    /**
     * @notice Get creator's accumulated fees
     * @param creator Creator address
     * @return uint256 Creator fee balance
     */
    function getCreatorFeeBalance(address creator) external view returns (uint256) {
        return creatorFeeBalances[creator];
    }

    /**
     * @notice Get total fees earned by creator
     * @param creator Creator address
     * @return uint256 Total creator fees earned
     */
    function getTotalCreatorFeesEarned(address creator) external view returns (uint256) {
        return totalCreatorFeesEarned[creator];
    }

    /**
     * @notice Get paginated list of markets with all their data
     * @param offset Starting index
     * @param limit Maximum number of markets to return (max 100)
     * @return totalMarkets Total number of markets
     * @return ids Array of market IDs
     * @return names Array of market names
     * @return outcomes Array of outcome arrays for each market
     * @return creators Array of creator addresses
     * @return oracles Array of oracle addresses
     * @return predictionDeadlines Array of prediction deadlines
     * @return isResolved Array of resolution statuses
     * @return isCancelled Array of cancellation statuses
     * @return winningOutcomes Array of winning outcome indices
     * @return totalPoolAmounts Array of total pool amounts
     * @return resolvedTimestamps Array of resolution timestamps
     * @return unclaimedWinningsCollected Array of unclaimed winnings collection statuses
     * @return creationTimestamps Array of creation timestamps
     * @return poolAmounts Array of pool amount arrays for each market
     */
    function getMarketsPage(uint256 offset, uint256 limit)
        external
        view
        returns (
            uint256 totalMarkets,
            uint256[] memory ids,
            string[] memory names,
            string[][] memory outcomes,
            address[] memory creators,
            address[] memory oracles,
            uint256[] memory predictionDeadlines,
            bool[] memory isResolved,
            bool[] memory isCancelled,
            uint256[] memory winningOutcomes,
            uint256[] memory totalPoolAmounts,
            uint256[] memory resolvedTimestamps,
            bool[] memory unclaimedWinningsCollected,
            uint256[] memory creationTimestamps,
            uint256[][] memory poolAmounts
        )
    {
        require(limit <= 100, "Maximum 100 markets per page");

        totalMarkets = nextMarketId;

        // Return empty arrays if offset is beyond total markets
        if (offset >= totalMarkets) {
            return (totalMarkets, ids, names, outcomes, creators, oracles, predictionDeadlines, isResolved, isCancelled, winningOutcomes, totalPoolAmounts, resolvedTimestamps, unclaimedWinningsCollected, creationTimestamps, poolAmounts);
        }

        // Calculate actual number of markets to return
        uint256 end = offset + limit;
        if (end > totalMarkets) {
            end = totalMarkets;
        }
        uint256 count = end - offset;

        // Initialize arrays
        ids = new uint256[](count);
        names = new string[](count);
        outcomes = new string[][](count);
        creators = new address[](count);
        oracles = new address[](count);
        predictionDeadlines = new uint256[](count);
        isResolved = new bool[](count);
        isCancelled = new bool[](count);
        winningOutcomes = new uint256[](count);
        totalPoolAmounts = new uint256[](count);
        resolvedTimestamps = new uint256[](count);
        unclaimedWinningsCollected = new bool[](count);
        creationTimestamps = new uint256[](count);
        poolAmounts = new uint256[][](count);

        // Fill arrays with market data
        for (uint256 i = 0; i < count; i++) {
            uint256 marketId = offset + i;
            Market storage m = markets[marketId];

            ids[i] = marketId;
            names[i] = m.name;
            outcomes[i] = m.outcomes;
            creators[i] = m.creator;
            oracles[i] = m.oracle;
            predictionDeadlines[i] = m.predictionDeadline;
            isResolved[i] = m.isResolved;
            isCancelled[i] = m.isCancelled;
            winningOutcomes[i] = m.winningOutcome;
            totalPoolAmounts[i] = m.totalPoolAmount;
            resolvedTimestamps[i] = m.resolvedTimestamp;
            unclaimedWinningsCollected[i] = m.unclaimedWinningsCollected;
            creationTimestamps[i] = m.creationTimestamp;

            // Convert poolAmounts mapping to array
            poolAmounts[i] = new uint256[](m.outcomes.length);
            for (uint256 j = 0; j < m.outcomes.length; j++) {
                poolAmounts[i][j] = m.poolAmounts[j];
            }
        }
    }
}
