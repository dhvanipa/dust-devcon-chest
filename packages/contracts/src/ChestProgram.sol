// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System, WorldContextConsumer } from "@latticexyz/world/src/System.sol";

import { HookContext, ITransfer } from "@dust/world/src/ProgramHooks.sol";
import { Verifier } from "./codegen/tables/Verifier.sol";

import { BaseProgram } from "./BaseProgram.sol";
import { Groth16Verifier } from "./Groth16Verifier.sol";

struct ProofArgs {
  uint256[2] _pA;
  uint256[2][2] _pB;
  uint256[2] _pC;
  uint256[126] _pubSignals;
}

contract ChestProgram is ITransfer, System, BaseProgram {
  function onTransfer(HookContext calldata ctx, TransferData calldata transfer) external onlyWorld {
    address verifier = Verifier.get();
    require(verifier != address(0), "Verifier not set");
    ProofArgs memory proof = abi.decode(ctx.extraData, (ProofArgs));
    require(Groth16Verifier(verifier).verifyProof(proof._pA, proof._pB, proof._pC, proof._pubSignals), "Invalid proof");
  }

  // Required due to inheriting from System and WorldConsumer
  function _msgSender() public view override(WorldContextConsumer, BaseProgram) returns (address) {
    return BaseProgram._msgSender();
  }

  function _msgValue() public view override(WorldContextConsumer, BaseProgram) returns (uint256) {
    return BaseProgram._msgValue();
  }

  function appConfigURI(EntityId) external pure returns (string memory) {
    return "http://localhost:3000/dust-app.json";
  }
}
