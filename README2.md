## Key Steps:

### Prerequisites

At the point of development, the tools below and their corresponding versions. were used

- node v24.11.1
- npm v11.6.2
- Python v3.9.6
- hardhat v2.22.6
- solidity

### Installation

- Install node - Check steps online based on the OS in use
- npm install --save-dev hardhat@2.22.6 // install hardhat
- npx hardhat init // Initialize hardhat
- npm install --save-dev @nomicfoundation/hardhat-toolbox
- npm install --save-dev solidity-coverage // Install solidity coverage plugin
- npm install ethers@6
- npx hardhat compile // Compile
- npx hardhat test // test
- npx hardhat coverage // coverage

## Running python commands on mac

Use python3 command or run the commands below to create an alias

```bash
echo "alias python=/usr/bin/python3" >> ~/.zshrc
source ~/.zshrc
```

## Slither

- pipx install slither-analyzer // install
- slither --version // 0.11.3
- slither . 


- pipx install mythril
- myth --version 0.24.8

## solc-verify
- brew install solc-select
- solc-select install 0.8.18 // installing the required compiler
- solc-select use 0.8.18 // activate
```bash
Switched global version to 0.8.10
```
- solc --version // verifying
```bash
solc, the solidity compiler commandline interface
Version: 0.8.18+commit.87f61d96.Darwin.appleclang
```

- solc-verify.py contracts/DoubleDepositEscrow.sol --output-dir out_original

docker build -t solc-verify-env .
docker run -it -v $(pwd):/workspace solc-verify-env bash
solc --version
solc-verify.py --help
