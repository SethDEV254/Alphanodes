// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AlphaNodes
 * @notice AI-Powered DeFi Platform on BSC
 * @dev Handles deposits, AI investments, staking, and withdrawals
 */
contract AlphaNodes {

    // ─── State ────────────────────────────────────────────────────────────────

    address public owner;
    address public treasury;
    bool public paused;

    uint256 public constant EARLY_UNLOCK_PENALTY = 20;   // 20% penalty
    uint256 public constant REFERRAL_RATE        = 5;    // 5% referral commission
    uint256 public constant MAX_LEVERAGE         = 100;
    uint256 public constant WITHDRAW_LIMIT_MULT  = 3;    // max 3x deposits

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct User {
        bool exists;
        address referrer;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 tradingBalance;
        uint256 aiEarnings;
        uint256 referralEarnings;
    }

    struct AIPackage {
        string  name;
        uint256 dailyRateBps;   // basis points (100 = 1%)
        uint256 minAmount;
        uint256 durationDays;
        bool    active;
    }

    struct AIInvestment {
        address user;
        uint256 packageId;
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
        uint256 claimedEarnings;
        bool    active;
    }

    struct Stake {
        address user;
        uint256 amount;
        uint256 dailyRateBps;
        uint256 startTime;
        uint256 endTime;
        uint256 claimedEarnings;
        bool    active;
        bool    earlyUnlocked;
    }

    struct WithdrawalRequest {
        address user;
        uint256 amount;
        uint256 timestamp;
        bool    approved;
        bool    rejected;
        bool    claimed;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    mapping(address => User) public users;
    address[] public userList;

    AIPackage[] public packages;

    mapping(uint256 => AIInvestment) public aiInvestments;
    uint256 public aiInvestmentCount;

    mapping(uint256 => Stake) public stakes;
    uint256 public stakeCount;

    mapping(uint256 => WithdrawalRequest) public withdrawals;
    uint256 public withdrawalCount;

    mapping(address => uint256[]) public userAIInvestments;
    mapping(address => uint256[]) public userStakes;
    mapping(address => uint256[]) public userWithdrawals;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Registered(address indexed user, address indexed referrer);
    event Deposited(address indexed user, uint256 amount);
    event AIInvested(address indexed user, uint256 indexed investmentId, uint256 packageId, uint256 amount);
    event AIEarningsClaimed(address indexed user, uint256 indexed investmentId, uint256 amount);
    event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 durationDays);
    event Unstaked(address indexed user, uint256 indexed stakeId, uint256 principal, uint256 earnings);
    event EarlyUnlocked(address indexed user, uint256 indexed stakeId, uint256 returned);
    event WithdrawalRequested(address indexed user, uint256 indexed withdrawalId, uint256 amount);
    event WithdrawalApproved(uint256 indexed withdrawalId);
    event WithdrawalClaimed(address indexed user, uint256 indexed withdrawalId, uint256 amount);
    event ReferralPaid(address indexed referrer, address indexed referee, uint256 amount);
    event PackageAdded(uint256 indexed packageId, string name, uint256 dailyRateBps);
    event Paused(bool status);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }

    modifier userExists() {
        require(users[msg.sender].exists, "Not registered");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury;

        // Seed default AI packages
        packages.push(AIPackage("Starter",    100, 0.05 ether,  30,  true)); // 1%/day
        packages.push(AIPackage("Growth",     150, 0.1 ether,   60,  true)); // 1.5%/day
        packages.push(AIPackage("Pro",        200, 0.3 ether,   90,  true)); // 2%/day
        packages.push(AIPackage("Elite",      280, 0.5 ether,   180, true)); // 2.8%/day
    }

    // ─── Registration ─────────────────────────────────────────────────────────

    /**
     * @notice Register a new user, optionally with a referrer
     */
    function register(address referrer) external {
        require(!users[msg.sender].exists, "Already registered");
        if (referrer != address(0) && referrer != msg.sender) {
            require(users[referrer].exists, "Referrer not registered");
        } else {
            referrer = address(0);
        }
        users[msg.sender] = User({
            exists:           true,
            referrer:         referrer,
            totalDeposited:   0,
            totalWithdrawn:   0,
            tradingBalance:   0,
            aiEarnings:       0,
            referralEarnings: 0,
        });
        userList.push(msg.sender);
        emit Registered(msg.sender, referrer);
    }

    // ─── Deposits ─────────────────────────────────────────────────────────────

    /**
     * @notice Deposit BNB to trading balance
     */
    function deposit() external payable notPaused userExists {
        require(msg.value > 0, "Zero deposit");

        uint256 fee    = (msg.value * 2) / 100;  // 2% platform fee
        uint256 credit = msg.value - fee;

        users[msg.sender].tradingBalance  += credit;
        users[msg.sender].totalDeposited  += credit;

        // Pay referral commission
        address referrer = users[msg.sender].referrer;
        if (referrer != address(0)) {
            uint256 refBonus = (credit * REFERRAL_RATE) / 100;
            users[referrer].referralEarnings += refBonus;
            emit ReferralPaid(referrer, msg.sender, refBonus);
        }

        // Forward fee to treasury
        payable(treasury).transfer(fee);

        emit Deposited(msg.sender, credit);
    }

    // ─── AI Investments ───────────────────────────────────────────────────────

    /**
     * @notice Start an AI investment from trading balance
     */
    function invest(uint256 packageId) external notPaused userExists {
        require(packageId < packages.length, "Invalid package");
        AIPackage memory pkg = packages[packageId];
        require(pkg.active, "Package inactive");

        // Get amount from msg — or pass as param. Using msg.value for flexibility.
        revert("Use investBalance() to invest from trading balance");
    }

    /**
     * @notice Invest from existing trading balance (no BNB transfer needed)
     */
    function investBalance(uint256 packageId, uint256 amount) external notPaused userExists {
        require(packageId < packages.length, "Invalid package");
        AIPackage memory pkg = packages[packageId];
        require(pkg.active, "Package inactive");
        require(amount >= pkg.minAmount, "Below minimum");
        require(users[msg.sender].tradingBalance >= amount, "Insufficient balance");

        users[msg.sender].tradingBalance -= amount;

        uint256 id = aiInvestmentCount++;
        aiInvestments[id] = AIInvestment({
            user:            msg.sender,
            packageId:       packageId,
            amount:          amount,
            startTime:       block.timestamp,
            endTime:         block.timestamp + pkg.durationDays * 1 days,
            claimedEarnings: 0,
            active:          true,
        });
        userAIInvestments[msg.sender].push(id);

        emit AIInvested(msg.sender, id, packageId, amount);
    }

    /**
     * @notice Claim accrued AI earnings
     */
    function claimAIEarnings(uint256 investmentId) external notPaused userExists {
        AIInvestment storage inv = aiInvestments[investmentId];
        require(inv.user == msg.sender, "Not yours");
        require(inv.active, "Not active");

        uint256 earned = _calcAIEarnings(inv);
        require(earned > 0, "Nothing to claim");

        inv.claimedEarnings += earned;
        users[msg.sender].aiEarnings += earned;
        users[msg.sender].tradingBalance += earned;

        // Auto-close if past end date
        if (block.timestamp >= inv.endTime) {
            inv.active = false;
            // Return principal
            users[msg.sender].tradingBalance += inv.amount;
        }

        emit AIEarningsClaimed(msg.sender, investmentId, earned);
    }

    function _calcAIEarnings(AIInvestment memory inv) internal view returns (uint256) {
        AIPackage memory pkg = packages[inv.packageId];
        uint256 elapsed  = block.timestamp - inv.startTime - _claimedDays(inv);
        uint256 maxDays  = pkg.durationDays;
        uint256 days_    = elapsed / 1 days;
        if (days_ > maxDays) days_ = maxDays;
        return (inv.amount * pkg.dailyRateBps * days_) / 10000;
    }

    function _claimedDays(AIInvestment memory inv) internal view returns (uint256) {
        AIPackage memory pkg = packages[inv.packageId];
        if (inv.amount == 0 || pkg.dailyRateBps == 0) return 0;
        return (inv.claimedEarnings * 10000 * 1 days) / (inv.amount * pkg.dailyRateBps);
    }

    // ─── Staking ──────────────────────────────────────────────────────────────

    /**
     * @notice Stake from trading balance
     * @param amount   Amount in wei
     * @param duration Lock duration in days (30/60/90/180)
     */
    function stake(uint256 amount, uint256 duration) external notPaused userExists {
        require(amount > 0, "Zero amount");
        require(users[msg.sender].tradingBalance >= amount, "Insufficient balance");

        uint256 rate = _stakeRate(duration);
        require(rate > 0, "Invalid duration");

        users[msg.sender].tradingBalance -= amount;

        uint256 id = stakeCount++;
        stakes[id] = Stake({
            user:            msg.sender,
            amount:          amount,
            dailyRateBps:    rate,
            startTime:       block.timestamp,
            endTime:         block.timestamp + duration * 1 days,
            claimedEarnings: 0,
            active:          true,
            earlyUnlocked:   false,
        });
        userStakes[msg.sender].push(id);

        emit Staked(msg.sender, id, amount, duration);
    }

    function _stakeRate(uint256 duration) internal pure returns (uint256) {
        if (duration == 30)  return 120;  // 1.2%/day
        if (duration == 60)  return 150;  // 1.5%/day
        if (duration == 90)  return 200;  // 2.0%/day
        if (duration == 180) return 280;  // 2.8%/day
        return 0;
    }

    /**
     * @notice Unstake after lock period ends
     */
    function unstake(uint256 stakeId) external notPaused userExists {
        Stake storage s = stakes[stakeId];
        require(s.user == msg.sender, "Not yours");
        require(s.active, "Not active");
        require(block.timestamp >= s.endTime, "Still locked");

        uint256 earnings = _calcStakeEarnings(s);
        s.active = false;

        uint256 total = s.amount + earnings;
        users[msg.sender].tradingBalance += total;

        emit Unstaked(msg.sender, stakeId, s.amount, earnings);
    }

    /**
     * @notice Early unlock with penalty
     */
    function earlyUnlock(uint256 stakeId) external notPaused userExists {
        Stake storage s = stakes[stakeId];
        require(s.user == msg.sender, "Not yours");
        require(s.active, "Not active");
        require(block.timestamp < s.endTime, "Already unlocked");

        uint256 penalty  = (s.amount * EARLY_UNLOCK_PENALTY) / 100;
        uint256 returned = s.amount - penalty;

        s.active        = false;
        s.earlyUnlocked = true;

        // Penalty goes to treasury
        payable(treasury).transfer(penalty);

        users[msg.sender].tradingBalance += returned;

        emit EarlyUnlocked(msg.sender, stakeId, returned);
    }

    function _calcStakeEarnings(Stake memory s) internal view returns (uint256) {
        uint256 duration = (s.endTime - s.startTime) / 1 days;
        return (s.amount * s.dailyRateBps * duration) / 10000;
    }

    // ─── Withdrawals ──────────────────────────────────────────────────────────

    /**
     * @notice Request withdrawal from trading balance
     */
    function requestWithdrawal(uint256 amount) external notPaused userExists {
        require(amount > 0, "Zero amount");
        require(users[msg.sender].tradingBalance >= amount, "Insufficient balance");

        // Enforce 3x withdrawal limit
        uint256 limit = users[msg.sender].totalDeposited * WITHDRAW_LIMIT_MULT;
        if (limit > 0) {
            require(users[msg.sender].totalWithdrawn + amount <= limit, "Withdrawal limit reached");
        }

        users[msg.sender].tradingBalance -= amount;

        uint256 id = withdrawalCount++;
        withdrawals[id] = WithdrawalRequest({
            user:      msg.sender,
            amount:    amount,
            timestamp: block.timestamp,
            approved:  false,
            rejected:  false,
            claimed:   false,
        });
        userWithdrawals[msg.sender].push(id);

        emit WithdrawalRequested(msg.sender, id, amount);
    }

    /**
     * @notice Admin approves withdrawal
     */
    function approveWithdrawal(uint256 withdrawalId) external onlyOwner {
        WithdrawalRequest storage w = withdrawals[withdrawalId];
        require(!w.approved && !w.rejected && !w.claimed, "Already processed");
        w.approved = true;
        emit WithdrawalApproved(withdrawalId);
    }

    /**
     * @notice User claims approved withdrawal
     */
    function claimWithdrawal(uint256 withdrawalId) external notPaused {
        WithdrawalRequest storage w = withdrawals[withdrawalId];
        require(w.user == msg.sender, "Not yours");
        require(w.approved, "Not approved");
        require(!w.claimed, "Already claimed");
        require(address(this).balance >= w.amount, "Insufficient contract balance");

        w.claimed = true;
        users[msg.sender].totalWithdrawn += w.amount;

        payable(msg.sender).transfer(w.amount);

        emit WithdrawalClaimed(msg.sender, withdrawalId, w.amount);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function addPackage(string calldata name, uint256 dailyRateBps, uint256 minAmount, uint256 durationDays) external onlyOwner {
        packages.push(AIPackage(name, dailyRateBps, minAmount, durationDays, true));
        emit PackageAdded(packages.length - 1, name, dailyRateBps);
    }

    function setPackageActive(uint256 packageId, bool active) external onlyOwner {
        require(packageId < packages.length, "Invalid package");
        packages[packageId].active = active;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    /**
     * @notice Fund the contract for withdrawals
     */
    function fundContract() external payable onlyOwner {}

    /**
     * @notice Emergency withdraw to treasury
     */
    function emergencyWithdraw() external onlyOwner {
        payable(treasury).transfer(address(this).balance);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getUser(address addr) external view returns (User memory) {
        return users[addr];
    }

    function getPackages() external view returns (AIPackage[] memory) {
        return packages;
    }

    function getUserAIInvestments(address addr) external view returns (uint256[] memory) {
        return userAIInvestments[addr];
    }

    function getUserStakes(address addr) external view returns (uint256[] memory) {
        return userStakes[addr];
    }

    function getUserWithdrawals(address addr) external view returns (uint256[] memory) {
        return userWithdrawals[addr];
    }

    function totalUsers() external view returns (uint256) {
        return userList.length;
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
