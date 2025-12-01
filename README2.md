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
