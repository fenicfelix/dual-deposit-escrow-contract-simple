// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract RevertingBuyer {

    address public escrow;

    function setEscrow(address _escrow) external {
        escrow = _escrow;
    }

    // Forward buyer_deposit to escrow
    function depositAsBuyer() external payable {
        (bool ok, ) = escrow.call{value: msg.value}(
            abi.encodeWithSignature("buyer_deposit()")
        );
        require(ok, "Forwarded buyer_deposit failed");
    }

    // Call approve() using delegatecall so msg.sender == this contract
    function approveAsBuyer() external {
        (bool ok, bytes memory data) = escrow.delegatecall(
            abi.encodeWithSignature("approve()")
        );

        if (!ok) {
            assembly {
                revert(add(data, 32), mload(data))
            }
        }
    }

    // Revert on receiving ETH (this triggers refund failure)
    receive() external payable {
        revert("Buyer reverted intentionally");
    }
}
