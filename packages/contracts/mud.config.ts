import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  codegen: {
    generateSystemLibraries: true,
  },
  namespace: "devcon",
  systems: {
    ChestProgram: {
      openAccess: false,
      deploy: { registerWorldFunctions: false },
    },
  },
  tables: {
    Verifier: {
      schema: {
        value: "address",
      },
      key: [],
    },
  },
});
