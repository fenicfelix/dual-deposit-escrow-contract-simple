// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.18;

contract SaferDoubleDepositEscrow {
    address payable public immutable buyer;
    address payable public immutable seller;

    uint256 public immutable paymentAmount;
    uint256 public immutable depositAmount;

    bool public buyerDeposited;
    bool public sellerDeposited;
    bool public isApproved;
    bool public completed;

    // Pull-payments: amounts each address can withdraw
    mapping(address => uint256) public pendingWithdrawals;

    // Simple reentrancy guard for withdraw()
    bool private locked;
    modifier nonReentrant() {
        require(!locked, "Reentrancy guard: re-entered");
        locked = true;
        _;
        locked = false;
    }

    constructor(
        address payable _buyer,
        address payable _seller,
        uint256 _paymentAmount,
        uint256 _depositAmount
    ) {
        require(_buyer != address(0) && _seller != address(0), "Zero address");
        require(
            _depositAmount > _paymentAmount,
            "Deposit must be > payment"
        );

        buyer = _buyer;
        seller = _seller;
        paymentAmount = _paymentAmount;
        depositAmount = _depositAmount;
    }

    /// @notice Buyer deposits the agreed double-deposit amount.
    function buyer_deposit() external payable {
        require(msg.sender == buyer, "Only buyer can deposit");
        require(!buyerDeposited, "Buyer already deposited");
        require(
            msg.value == depositAmount,
            "Incorrect buyer deposit amount"
        );

        buyerDeposited = true;
    }

    /// @notice Seller deposits the agreed double-deposit amount.
    function seller_deposit() external payable {
        require(msg.sender == seller, "Only seller can deposit");
        require(!sellerDeposited, "Seller already deposited");
        require(
            msg.value == depositAmount,
            "Incorrect seller deposit amount"
        );

        sellerDeposited = true;
    }

    /// @notice Buyer approves release of funds.
    /// @dev No ETH is sent here; we only update balances for later withdrawal.
    function approve() external {
        require(msg.sender == buyer, "Only buyer can approve");
        require(!isApproved, "Already approved");
        require(buyerDeposited, "Buyer has not deposited");
        require(sellerDeposited, "Seller has not deposited");
        require(!completed, "Escrow already completed");

        isApproved = true;
        completed = true;

        // Calculate entitlements:
        // Seller gets: payment + their own deposit
        // Buyer gets: remaining part of their deposit
        uint256 sellerPayout = paymentAmount + depositAmount;
        uint256 buyerRefund = depositAmount - paymentAmount;

        // Record withdrawable balances (pull pattern)
        pendingWithdrawals[seller] += sellerPayout;
        pendingWithdrawals[buyer] += buyerRefund;
    }

    /// @notice Withdraw any available balance.
    /// @dev Uses CEI pattern + nonReentrant guard.
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        // Effects: zero balance before external call
        pendingWithdrawals[msg.sender] = 0;

        // Interaction: single, guarded external call
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdraw failed");
    }

    /// @notice Helper to expose total funds held by the contract.
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
