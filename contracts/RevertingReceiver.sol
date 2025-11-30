// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract RevertingReceiver {
    receive() external payable {
        revert("Receiver reverted intentionally");
    }
}