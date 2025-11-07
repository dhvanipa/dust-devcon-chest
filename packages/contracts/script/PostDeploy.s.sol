// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { console } from "forge-std/console.sol";

import { Script } from "./Script.sol";

import { chestProgram } from "../src/codegen/systems/ChestProgramLib.sol";
import { Verifier } from "../src/codegen/tables/Verifier.sol";
import { Groth16Verifier } from "../src/Groth16Verifier.sol";

contract PostDeploy is Script {
  function run(address worldAddress) external {
    StoreSwitch.setStoreAddress(worldAddress);
    startBroadcast();

    // do something

    vm.stopBroadcast();

    if (block.chainid == 31337) {
      console.log("Setting local world address to:", worldAddress);
      _setLocalWorldAddress(worldAddress);
    }

    Groth16Verifier verifier = new Groth16Verifier();
    console.log("Deployed Groth16Verifier to:", address(verifier));

    Verifier.set(address(verifier));
  }

  // Set the world address by directly writing to storage for local setup
  function _setLocalWorldAddress(address worldAddress) internal {
    bytes32 worldSlot = keccak256("mud.store.storage.StoreSwitch");
    bytes32 worldAddressBytes32 = bytes32(uint256(uint160(worldAddress)));
    vm.store(chestProgram.getAddress(), worldSlot, worldAddressBytes32);
  }
}
