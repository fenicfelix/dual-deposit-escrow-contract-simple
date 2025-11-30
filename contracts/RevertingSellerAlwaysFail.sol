// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract RevertingSellerAlwaysFail {
    address public escrow;

    function setEscrow(address _escrow) external {
        escrow = _escrow;
    }

    function depositAsSeller() external payable {
        (bool ok, ) = escrow.call{value: msg.value}(
            abi.encodeWithSignature("seller_deposit()")
        );
        require(ok, "Forwarded seller_deposit failed");
    }

    // ALWAYS revert on receive, so paymentAmount transfer fails
    receive() external payable {
        revert("Seller always reverts");
    }
}
