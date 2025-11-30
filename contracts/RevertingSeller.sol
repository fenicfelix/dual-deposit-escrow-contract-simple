// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract RevertingSeller {
    address public escrow;
    uint256 public receiveCount;

    function setEscrow(address _escrow) external {
        escrow = _escrow;
    }

    // Forward seller_deposit()
    function depositAsSeller() external payable {
        (bool ok, ) = escrow.call{value: msg.value}(
            abi.encodeWithSignature("seller_deposit()")
        );
        require(ok, "Forwarded seller_deposit failed");
    }

    // First payment succeeds, second payment fails
    receive() external payable {
        receiveCount++;
        if (receiveCount == 1) {
            // SUCCESS: allow first (paymentAmount)
        } else {
            // FAIL: reject second (depositAmount)
            revert("Seller reverted intentionally");
        }
    }
}
