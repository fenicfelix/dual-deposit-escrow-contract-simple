pragma solidity ^0.8.18;

contract RevertingBuyer {
    address public escrow;

    function setEscrow(address _escrow) external {
        escrow = _escrow;
    }

    function depositAsBuyer() external payable {
        (bool ok, ) = escrow.call{value: msg.value}(
            abi.encodeWithSignature("buyer_deposit()")
        );
        require(ok, "Forwarded buyer_deposit failed");
    }

    function approveAsBuyer() external {
        (bool ok, bytes memory data) = escrow.call(
            abi.encodeWithSignature("approve()")
        );
        if (!ok) {
            assembly {
                revert(add(data, 32), mload(data))
            }
        }
    }

    receive() external payable {
        revert("Buyer reverted intentionally");
    }
}
