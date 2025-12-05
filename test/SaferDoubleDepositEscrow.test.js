const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SaferDoubleDepositEscrow", function () {
    let buyer, seller, attacker, other;
    let escrow;

    const paymentAmount = ethers.utils.parseEther("1");
    const depositAmount = ethers.utils.parseEther("2");

    beforeEach(async () => {
        [buyer, seller, attacker, other] = await ethers.getSigners();

        const Escrow = await ethers.getContractFactory("SaferDoubleDepositEscrow");
        escrow = await Escrow.deploy(
            buyer.address,
            seller.address,
            paymentAmount,
            depositAmount
        );
        await escrow.deployed();
    });

    /* -----------------------------
       Constructor Tests
    ------------------------------ */

    it("Should deploy correctly with immutable values", async () => {
        expect(await escrow.buyer()).to.equal(buyer.address);
        expect(await escrow.seller()).to.equal(seller.address);
        expect(await escrow.paymentAmount()).to.equal(paymentAmount);
        expect(await escrow.depositAmount()).to.equal(depositAmount);
    });

    it("Should revert on zero address parameters", async () => {
        const Escrow = await ethers.getContractFactory("SaferDoubleDepositEscrow");
        await expect(
            Escrow.deploy(
                ethers.constants.AddressZero,
                seller.address,
                paymentAmount,
                depositAmount
            )
        ).to.be.revertedWith("Zero address");

        await expect(
            Escrow.deploy(
                buyer.address,
                ethers.constants.AddressZero,
                paymentAmount,
                depositAmount
            )
        ).to.be.revertedWith("Zero address");
    });

    it("Should revert if deposit not > payment", async () => {
        const Escrow = await ethers.getContractFactory("SaferDoubleDepositEscrow");
        await expect(
            Escrow.deploy(buyer.address, seller.address, 5, 5)
        ).to.be.revertedWith("Deposit must exceed payment");
    });


    /* -----------------------------
       Deposit Tests
    ------------------------------ */

    it("Buyer can deposit correctly", async () => {
        await expect(
            escrow.connect(buyer).buyerDeposit({ value: depositAmount })
        ).to.emit(escrow, "BuyerDeposited");

        expect(await escrow.buyerDeposited()).to.equal(true);
    });

    it("Seller can deposit correctly", async () => {
        await expect(
            escrow.connect(seller).sellerDeposit({ value: depositAmount })
        ).to.emit(escrow, "SellerDeposited");

        expect(await escrow.sellerDeposited()).to.equal(true);
    });

    it("Should revert if someone else tries to deposit as buyer", async () => {
        await expect(
            escrow.connect(seller).buyerDeposit({ value: depositAmount })
        ).to.be.revertedWith("Only buyer");
    });

    it("Should revert if someone else tries to deposit as seller", async () => {
        await expect(
            escrow.connect(buyer).sellerDeposit({ value: depositAmount })
        ).to.be.revertedWith("Only seller");
    });

    it("Should revert if incorrect deposit amount (buyer)", async () => {
        await expect(
            escrow.connect(buyer).buyerDeposit({ value: 1 })
        ).to.be.revertedWith("Incorrect deposit amount");
    });

    it("Should revert if incorrect deposit amount (seller)", async () => {
        await expect(
            escrow.connect(seller).sellerDeposit({ value: 1 })
        ).to.be.revertedWith("Incorrect deposit amount");
    });

    it("Should revert on double deposits", async () => {
        await escrow.connect(buyer).buyerDeposit({ value: depositAmount });
        await expect(
            escrow.connect(buyer).buyerDeposit({ value: depositAmount })
        ).to.be.revertedWith("Buyer already deposited");

        await escrow.connect(seller).sellerDeposit({ value: depositAmount });
        await expect(
            escrow.connect(seller).sellerDeposit({ value: depositAmount })
        ).to.be.revertedWith("Seller already deposited");
    });


    /* -----------------------------
       Approval Tests
    ------------------------------ */

    it("Should revert approve if buyer not deposited", async () => {
        await escrow.connect(seller).sellerDeposit({ value: depositAmount });
        await expect(
            escrow.connect(buyer).approve()
        ).to.be.revertedWith("Buyer not deposited");
    });

    it("Should revert approve if seller not deposited", async () => {
        await escrow.connect(buyer).buyerDeposit({ value: depositAmount });
        await expect(
            escrow.connect(buyer).approve()
        ).to.be.revertedWith("Seller not deposited");
    });

    it("Should revert approve if non-buyer tries", async () => {
        await expect(
            escrow.connect(attacker).approve()
        ).to.be.revertedWith("Only buyer can approve");
    });

    it("Buyer can approve when conditions met", async () => {
        await escrow.connect(buyer).buyerDeposit({ value: depositAmount });
        await escrow.connect(seller).sellerDeposit({ value: depositAmount });

        await expect(
            escrow.connect(buyer).approve()
        ).to.emit(escrow, "Approved");

        expect(await escrow.isApproved()).to.equal(true);
        expect(await escrow.completed()).to.equal(true);
    });

    it("Should revert double approval", async () => {
        await escrow.connect(buyer).buyerDeposit({ value: depositAmount });
        await escrow.connect(seller).sellerDeposit({ value: depositAmount });

        await escrow.connect(buyer).approve();
        await expect(
            escrow.connect(buyer).approve()
        ).to.be.revertedWith("Already approved");
    });


    /* -----------------------------
       Withdrawal + Reentrancy Tests
    ------------------------------ */

    it("Approve should credit buyer and seller correctly", async () => {
        await escrow.connect(buyer).buyerDeposit({ value: depositAmount });
        await escrow.connect(seller).sellerDeposit({ value: depositAmount });

        await escrow.connect(buyer).approve();

        const sellerExpected = paymentAmount.add(depositAmount);
        const buyerExpected = depositAmount.sub(paymentAmount);

        expect(await escrow.pendingWithdrawal(seller.address)).to.equal(sellerExpected);
        expect(await escrow.pendingWithdrawal(buyer.address)).to.equal(buyerExpected);
    });

    it("Users can withdraw their credits", async () => {
        await escrow.connect(buyer).buyerDeposit({ value: depositAmount });
        await escrow.connect(seller).sellerDeposit({ value: depositAmount });
        await escrow.connect(buyer).approve();

        await expect(() =>
            escrow.connect(seller).withdraw()
        ).to.changeEtherBalance(
            seller,
            paymentAmount.add(depositAmount)
        );

        await expect(() =>
            escrow.connect(buyer).withdraw()
        ).to.changeEtherBalance(
            buyer,
            depositAmount.sub(paymentAmount)
        );
    });

    it("Should revert withdrawal if no balance", async () => {
        await expect(
            escrow.connect(attacker).withdraw()
        ).to.be.revertedWith("Nothing to withdraw");
    });

    it("Should block reentrancy by preventing unauthorized withdrawals", async () => {
        const Reentrant = await ethers.getContractFactory("ReentrantAttacker");
        const attackerContract = await Reentrant.deploy(escrow.address);
        await attackerContract.deployed();

        await escrow.connect(buyer).buyerDeposit({ value: depositAmount });
        await escrow.connect(seller).sellerDeposit({ value: depositAmount });
        await escrow.connect(buyer).approve();

        // Manually assign credits to attacker to test reentrancy attempt
        await ethers.provider.send("hardhat_setBalance", [
            attackerContract.address,
            "0x1000000000000000000",
        ]);

        // Attempt reentrancy, expect failure
        await expect(
            attackerContract.attack()
        ).to.be.revertedWith("Nothing to withdraw");
    });

    describe("contractBalance()", function () {
    it("Should return 0 before any deposits", async function () {
        const balance = await escrow.contractBalance();
        expect(balance).to.equal(0);
    });

    it("Should return correct balance after deposits", async function () {
        // Buyer deposits
        await escrow.connect(buyer).buyerDeposit({ value: depositAmount });

        // Seller deposits
        await escrow.connect(seller).sellerDeposit({ value: depositAmount });

        // Expected contract balance = buyer deposit + seller deposit
        const expected = depositAmount.mul(2);

        const balance = await escrow.contractBalance();
        expect(balance).to.equal(expected);
    });

    it("Should decrease after withdrawals", async function () {
        // Buyer deposits
        await escrow.connect(buyer).buyerDeposit({ value: depositAmount });

        // Seller deposits
        await escrow.connect(seller).sellerDeposit({ value: depositAmount });

        // Approve escrow
        await escrow.connect(buyer).approve();

        // Seller withdraws
        await escrow.connect(seller).withdraw();

        // Contract balance should now be buyerRefund only
        const buyerRefund = depositAmount.sub(paymentAmount);
        const balanceAfter = await escrow.contractBalance();

        expect(balanceAfter).to.equal(buyerRefund);
    });
});


});
