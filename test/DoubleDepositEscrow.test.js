const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DoubleDepositEscrow", function () {
    let buyer, seller, other;
    let escrow;

    const paymentAmount = ethers.utils.parseEther("1");
    const depositAmount = ethers.utils.parseEther("2");

    beforeEach(async function () {
        [buyer, seller, other] = await ethers.getSigners();

        const Escrow = await ethers.getContractFactory("DoubleDepositEscrow");
        escrow = await Escrow.deploy(
            buyer.address,
            seller.address,
            paymentAmount,
            depositAmount
        );
        await escrow.deployed();
    });

    it("Should deploy with correct state", async () => {
        expect(await escrow.buyer()).to.equal(buyer.address);
        expect(await escrow.seller()).to.equal(seller.address);
        expect(await escrow.paymentAmount()).to.equal(paymentAmount);
        expect(await escrow.depositAmount()).to.equal(depositAmount);
        expect(await escrow.buyerDeposited()).to.equal(false);
        expect(await escrow.sellerDeposited()).to.equal(false);
        expect(await escrow.isApproved()).to.equal(false);
    });

    it("Should revert if depositAmount <= paymentAmount", async () => {
        const Escrow = await ethers.getContractFactory("DoubleDepositEscrow");
        await expect(
            Escrow.deploy(buyer.address, seller.address, 10, 5)
        ).to.be.revertedWith("Deposit amount must be greater than payment amount");
    });

    it("Buyer can deposit correctly", async () => {
        await escrow.connect(buyer).buyer_deposit({ value: depositAmount });
        expect(await escrow.buyerDeposited()).to.equal(true);
    });

    it("Should revert if non-buyer tries to deposit", async () => {
        await expect(
            escrow.connect(seller).buyer_deposit({ value: depositAmount })
        ).to.be.revertedWith("Only buyer can deposit.");
    });

    it("Should revert if buyer deposits wrong amount", async () => {
        await expect(
            escrow.connect(buyer).buyer_deposit({ value: 1 })
        ).to.be.revertedWith(
            "Deposit amount should be equal to the deposit amount specified."
        );
    });

    it("Should revert if buyer deposits twice", async () => {
        await escrow.connect(buyer).buyer_deposit({ value: depositAmount });

        await expect(
            escrow.connect(buyer).buyer_deposit({ value: depositAmount })
        ).to.be.revertedWith("Buyer has already deposited.");
    });

    it("Seller can deposit correctly", async () => {
        await escrow.connect(seller).seller_deposit({ value: depositAmount });
        expect(await escrow.sellerDeposited()).to.equal(true);
    });

    it("Should revert if non-seller tries to deposit", async () => {
        await expect(
            escrow.connect(buyer).seller_deposit({ value: depositAmount })
        ).to.be.revertedWith("Only seller can deposit.");
    });

    it("Should revert if seller deposits wrong amount", async () => {
        await expect(
            escrow.connect(seller).seller_deposit({ value: 1 })
        ).to.be.revertedWith(
            "Deposit amount should be equal to the deposit amount specified."
        );
    });

    it("Should revert if seller deposits twice", async () => {
        await escrow.connect(seller).seller_deposit({ value: depositAmount });

        await expect(
            escrow.connect(seller).seller_deposit({ value: depositAmount })
        ).to.be.revertedWith("Seller has already deposited.");
    });

    it("Should revert if non-buyer tries to approve", async () => {
        await expect(
            escrow.connect(seller).approve()
        ).to.be.revertedWith("Only buyer can approve.");
    });

    it("Should revert if approve is called before deposits", async () => {
        await expect(
            escrow.connect(buyer).approve()
        ).to.be.revertedWith("Buyer has not yet deposited");
    });

    it("Should revert if seller hasn't deposited yet", async () => {
        await escrow.connect(buyer).buyer_deposit({ value: depositAmount });

        await expect(
            escrow.connect(buyer).approve()
        ).to.be.revertedWith("Seller has not yet deposited");
    });

    it("Should approve the transaction and move funds correctly", async () => {
        await escrow.connect(buyer).buyer_deposit({ value: depositAmount });
        await escrow.connect(seller).seller_deposit({ value: depositAmount });

        await expect(() =>
            escrow.connect(buyer).approve()
        ).to.changeEtherBalances(
            [seller, buyer],
            [
                paymentAmount.add(depositAmount),      // seller: payment + deposit
                depositAmount.sub(paymentAmount)       // buyer: residual
            ]
        );

        expect(await escrow.isApproved()).to.equal(true);
    });

    it("Should revert if buyer hasn't deposited but seller has", async () => {
        await escrow.connect(seller).seller_deposit({ value: depositAmount });

        await expect(
            escrow.connect(buyer).approve()
        ).to.be.revertedWith("Buyer has not yet deposited");
    });

    it("Should revert if approve is called twice", async () => {
        await escrow.connect(buyer).buyer_deposit({ value: depositAmount });
        await escrow.connect(seller).seller_deposit({ value: depositAmount });

        await escrow.connect(buyer).approve();

        await expect(
            escrow.connect(buyer).approve()
        ).to.be.revertedWith("Transaction has already been approved.");
    });

    it("Should revert if payment to seller fails", async () => {
        const BadSeller = await ethers.getContractFactory("RevertingSellerAlwaysFail");
        const badSeller = await BadSeller.deploy();
        await badSeller.deployed();

        const Escrow = await ethers.getContractFactory("DoubleDepositEscrow");
        const escrowBad = await Escrow.deploy(
            buyer.address,
            badSeller.address,
            paymentAmount,
            depositAmount
        );
        await escrowBad.deployed();
        await badSeller.setEscrow(escrowBad.address);

        // normal buyer deposit
        await escrowBad.connect(buyer).buyer_deposit({ value: depositAmount });

        // seller deposit through forwarder
        await badSeller.depositAsSeller({ value: depositAmount });

        // first transfer should fail → hit "Payment to seller failed."
        await expect(
            escrowBad.connect(buyer).approve()
        ).to.be.revertedWith("Payment to seller failed.");
    });


    //
    // External-call failure branches
    //

    it("Should revert if deposit refund to seller fails", async () => {
        const RevertingSeller = await ethers.getContractFactory("RevertingSeller");
        const badSeller = await RevertingSeller.deploy();
        await badSeller.deployed();

        const Escrow = await ethers.getContractFactory("DoubleDepositEscrow");
        const escrowBad = await Escrow.deploy(
            buyer.address,
            badSeller.address,
            paymentAmount,
            depositAmount
        );
        await escrowBad.deployed();
        await badSeller.setEscrow(escrowBad.address);

        // buyer & seller deposits
        await escrowBad.connect(buyer).buyer_deposit({ value: depositAmount });
        await badSeller.depositAsSeller({ value: depositAmount });

        // First payment (paymentAmount) succeeds,
        // second transfer (depositAmount) to badSeller reverts.
        await expect(
            escrowBad.connect(buyer).approve()
        ).to.be.revertedWith("Payment to seller failed.");
    });

    it("Should revert if residual refund to buyer fails", async () => {
        const RevertingBuyer = await ethers.getContractFactory("RevertingBuyer");
        const badBuyer = await RevertingBuyer.deploy();
        await badBuyer.deployed();

        const Escrow = await ethers.getContractFactory("DoubleDepositEscrow");
        const escrowBad = await Escrow.deploy(
            badBuyer.address,     // buyer is the reverting contract
            seller.address,
            paymentAmount,
            depositAmount
        );
        await escrowBad.deployed();
        await badBuyer.setEscrow(escrowBad.address);

        // Buyer deposit via forwarder
        await badBuyer.depositAsBuyer({ value: depositAmount });

        // Seller deposit normally
        await escrowBad.connect(seller).seller_deposit({ value: depositAmount });

        // Approve via forwarder – internal refund to buyer will hit
        // RevertingBuyer.receive() and revert
        await expect(
            badBuyer.approveAsBuyer()
        ).to.be.revertedWith("Residual deposit refund to buyer failed.");
    });
});
