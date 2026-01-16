// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
//pragma solidity ^0.8.18;
contract DoubleDepositEscrow {
    address payable public buyer;
    address payable public seller;
    uint public paymentAmount;
    uint public depositAmount;
    bool public buyerDeposited;
    bool public sellerDeposited;
    bool public isApproved;
    
    constructor(address payable _buyer, address payable _seller, uint _paymentAmount, uint _depositAmount) {
        require(_depositAmount > _paymentAmount, "Deposit amount must be greater than payment amount");
        buyer = _buyer;
        seller = _seller;
        paymentAmount = _paymentAmount;
        depositAmount = _depositAmount;
        buyerDeposited = false;
        sellerDeposited = false;
        isApproved = false;
    }
    
    function buyer_deposit() payable public {
        require(msg.sender == buyer, "Only buyer can deposit.");
        require(!buyerDeposited, "Buyer has already deposited.");
        require(msg.value == depositAmount, "Deposit amount should be equal to the deposit amount specified.");
        buyerDeposited = true;      
    }
    
    function seller_deposit() payable public {
        require(msg.sender == seller, "Only seller can deposit.");
        require(!sellerDeposited, "Seller has already deposited.");
        require(msg.value == depositAmount, "Deposit amount should be equal to the deposit amount specified.");
        sellerDeposited = true;
    }
 
    function approve() public {
        require(msg.sender == buyer, "Only buyer can approve.");
        require(!isApproved, "Transaction has already been approved.");
        require(buyerDeposited, "Buyer has not yet deposited");
        require(sellerDeposited, "Seller has not yet deposited");
        isApproved = true;
        
        /* Updated the below lines of code to use call for testing reasons,
        ** so that we can simulate reverts in the receiving contracts
        */

        // require(seller.send(paymentAmount), "Payment to seller failed.");
        // require(seller.send(depositAmount), "Deposit refund to seller failed.");
        // require(buyer.send(depositAmount - paymentAmount), "Residual deposit refund to buyer failed.");

        (bool s1, ) = seller.call{value: paymentAmount}("");
        require(s1, "Payment to seller failed.");

        (bool s2, ) = seller.call{value: depositAmount}("");
        require(s2, "Deposit refund to seller failed.");

        (bool s3, ) = buyer.call{value: depositAmount - paymentAmount}("");
        require(s3, "Residual deposit refund to buyer failed.");        
    }
}
