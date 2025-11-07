// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System, WorldContextConsumer } from "@latticexyz/world/src/System.sol";

import { EntityId } from "@dust/world/src/types/EntityId.sol";
import { HookContext, ITransfer } from "@dust/world/src/ProgramHooks.sol";
import { Verifier } from "./codegen/tables/Verifier.sol";
import { ClaimedGift } from "./codegen/tables/ClaimedGift.sol";

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

    // First verify the constants
    require(verifyPubSignalKnownConstants(proof), "Invalid known constants");

    // Then verify the attributes
    require(verifyDevconAttributes(proof), "Invalid Devcon attributes");

    // And finally verify the proof
    require(Groth16Verifier(verifier).verifyProof(proof._pA, proof._pB, proof._pC, proof._pubSignals), "Invalid proof");

    require(transfer.deposits.length == 0 && transfer.withdrawals.length == 1, "Only withdrawals allowed");
    require(transfer.withdrawals[0].amount == 1, "Can only withdraw 1 item");
    uint256 ticketId = proof._pubSignals[3];
    require(!ClaimedGift.getClaimed(ticketId), "Gift already claimed for this ticket");
    ClaimedGift.setClaimed(ticketId, true);
  }

  function verifyDevconAttributes(ProofArgs memory proof) internal pure returns (bool) {
    string memory devcon7SpeakerTicketProductId = "c64cac28-5719-4260-bd9a-ea0c0cb04d54";
    require(proof._pubSignals[2] == sha256RightShift8(devcon7SpeakerTicketProductId), "Invalid ticket type");

    // TODO: add attendee ticket product ID

    return true;
  }

  function verifyPubSignalKnownConstants(ProofArgs memory proof) internal pure returns (bool) {
    require(
      proof._pubSignals[16] == 9827233895519418630358292210262095306235721029080329270183982632207226606614,
      "Invalid nullifier"
    );

    // Fixed input values for public signals
    uint256[109] memory fixedValues = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      166182936600638516720995614121151326301699226988280236171566516501807187846,
      134391921332508560099964544679493715295561887371159641958333364222734962117,
      232848270766376164316822953942312735900953645668487075578980239826709112075,
      373919738965490985996369790908574293362289358408055897574255306336508420178,
      166182936600638516720995614121151326301699226988280236171566516501807187846,
      166182936600638516720995614121151326301699226988280236171566516501807187846,
      166182936600638516720995614121151326301699226988280236171566516501807187846,
      166182936600638516720995614121151326301699226988280236171566516501807187846,
      166182936600638516720995614121151326301699226988280236171566516501807187846,
      166182936600638516720995614121151326301699226988280236171566516501807187846,
      12,
      2,
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      65535,
      110624500886210682903957915801170533319480769175378008503012161311733680228,
      1,
      1,
      21888242871839275222246405745257275088548364400416034343698204186575808495616,
      21888242871839275222246405745257275088548364400416034343698204186575808495616,
      21888242871839275222246405745257275088548364400416034343698204186575808495616,
      21888242871839275222246405745257275088548364400416034343698204186575808495616,
      15,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      11,
      0,
      0,
      0,
      16,
      21888242871839275222246405745257275088548364400416034343698204186575808495616,
      3,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      8456889787799625414444204171689102638141363271701289610195982589328535866545,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      21888242871839275222246405745257275088548364400416034343698204186575808495616
    ];

    for (uint256 i = 17; i < 126; i++) {
      require(
        proof._pubSignals[i] == fixedValues[i - 17],
        string(abi.encodePacked("Invalid known constant at index ", i))
      );
    }

    return true;
  }

  function sha256RightShift8(string memory input) internal pure returns (uint256 shifted) {
    // Compute SHA-256 hash of the input
    bytes32 hashBytes = sha256(abi.encodePacked(input));

    // Convert to uint256
    uint256 fullHash = uint256(hashBytes);

    // Right-shift by 8 bits
    shifted = fullHash >> 8;
  }

  // Required due to inheriting from System and WorldConsumer
  function _msgSender() public view override(WorldContextConsumer, BaseProgram) returns (address) {
    return BaseProgram._msgSender();
  }

  function _msgValue() public view override(WorldContextConsumer, BaseProgram) returns (uint256) {
    return BaseProgram._msgValue();
  }

  function appConfigURI(EntityId) external pure returns (string memory) {
    return "https://devcon.pateldhvani.com/dust-app.json";
  }
}
