// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract SaferDoubleDepositEscrow {
    /// -----------------------------------------------------------------------
    /// Immutable Contract Parameters
    /// -----------------------------------------------------------------------
    address payable public immutable buyer;
    address payable public immutable seller;

    uint256 public immutable paymentAmount;
    uint256 public immutable depositAmount;

    /// -----------------------------------------------------------------------
    /// State Flags
    /// -----------------------------------------------------------------------
    bool public buyerDeposited;
    bool public sellerDeposited;
    bool public isApproved;
    bool public completed;

    /// -----------------------------------------------------------------------
    /// Pull-Payment Balances
    /// -----------------------------------------------------------------------
    mapping(address => uint256) private credits;

    /// -----------------------------------------------------------------------
    /// Events (recommended for auditability + static analysis clarity)
    /// -----------------------------------------------------------------------
    event BuyerDeposited(address indexed buyer, uint256 amount);
    event SellerDeposited(address indexed seller, uint256 amount);
    event Approved(address indexed buyer);
    event Withdrawal(address indexed user, uint256 amount);

    /// -----------------------------------------------------------------------
    /// Reentrancy Guard (formal-verification–friendly)
    /// -----------------------------------------------------------------------
    bool private locked;
    modifier nonReentrant() {
        require(!locked, "Reentrancy guard: re-entered");
        locked = true;
        _;
        locked = false;
    }

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------
    constructor(
        address payable _buyer,
        address payable _seller,
        uint256 _paymentAmount,
        uint256 _depositAmount
    ) {
        require(_buyer != address(0) && _seller != address(0), "Zero address");
        require(_depositAmount > _paymentAmount, "Deposit must exceed payment");

        buyer = _buyer;
        seller = _seller;
        paymentAmount = _paymentAmount;
        depositAmount = _depositAmount;
    }

    /// -----------------------------------------------------------------------
    /// Buyer Deposit
    /// -----------------------------------------------------------------------
    function buyerDeposit() external payable {
        require(msg.sender == buyer, "Only buyer");
        require(!buyerDeposited, "Buyer already deposited");
        require(msg.value == depositAmount, "Incorrect deposit amount");

        buyerDeposited = true;
        emit BuyerDeposited(msg.sender, msg.value);
    }

    /// -----------------------------------------------------------------------
    /// Seller Deposit
    /// -----------------------------------------------------------------------
    function sellerDeposit() external payable {
        require(msg.sender == seller, "Only seller");
        require(!sellerDeposited, "Seller already deposited");
        require(msg.value == depositAmount, "Incorrect deposit amount");

        sellerDeposited = true;
        emit SellerDeposited(msg.sender, msg.value);
    }

    /// -----------------------------------------------------------------------
    /// Approve escrow settlement (No external calls: CEI-compatible)
    /// -----------------------------------------------------------------------
    function approve() external {
        require(msg.sender == buyer, "Only buyer can approve");
        require(!isApproved, "Already approved");
        require(buyerDeposited, "Buyer not deposited");
        require(sellerDeposited, "Seller not deposited");
        require(!completed, "Escrow completed");

        isApproved = true;
        completed = true;

        uint256 sellerPayout = paymentAmount + depositAmount;
        uint256 buyerRefund = depositAmount - paymentAmount;

        // Only internal state updates here
        credits[seller] += sellerPayout;
        credits[buyer] += buyerRefund;

        emit Approved(msg.sender);
    }

    /// -----------------------------------------------------------------------
    /// Withdraw (pull-payment + CEI + reentrancy guard)
    /// -----------------------------------------------------------------------
    function withdraw() external nonReentrant {
        uint256 amount = credits[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        // Effects
        credits[msg.sender] = 0;

        // Interaction
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdraw failed");

        emit Withdrawal(msg.sender, amount);
    }

    /// -----------------------------------------------------------------------
    /// Read-only helpers
    /// -----------------------------------------------------------------------
    function pendingWithdrawal(address user) external view returns (uint256) {
        return credits[user];
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
