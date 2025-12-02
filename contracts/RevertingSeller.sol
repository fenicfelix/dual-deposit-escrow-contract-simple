// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract RevertingSeller {
    address public escrow;
    uint256 public receiveCount;

    function setEscrow(address _escrow) external {
        escrow = _escrow;
    }

    function depositAsSeller() external payable {
        (bool ok, ) = escrow.call{value: msg.value}(
            abi.encodeWithSignature("seller_deposit()")
        );
        require(ok, "Forwarded seller_deposit failed");
    }

    // 1st receive OK, 2nd receive reverts
    receive() external payable {
        receiveCount++;
        if (receiveCount == 1) {
            // accept first payment
        } else {
            revert("Seller reverted intentionally");
        }
    }
}
