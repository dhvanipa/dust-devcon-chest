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

    if (Verifier.get() != address(0)) {
      console.log("Verifier already set, skipping deployment", Verifier.get());
      vm.stopBroadcast();
      return;
    }

    Groth16Verifier verifier = new Groth16Verifier();
    console.log("Deployed Groth16Verifier to:", address(verifier));

    Verifier.set(address(verifier));

    vm.stopBroadcast();
  }
}
