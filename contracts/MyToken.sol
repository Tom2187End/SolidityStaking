//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// This is the main building block for smart contracts.
contract MyToken is ERC20 {
    // The fixed amount of tokens, stored in an unsigned integer type variable.
    uint constant _initial_supply = 5000000000 * (10**18);

    constructor() ERC20("Test Token", "TT") {
        _mint(msg.sender, _initial_supply);
    }
}