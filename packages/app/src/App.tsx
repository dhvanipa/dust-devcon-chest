import { usePlayerStatus } from "./common/usePlayerStatus";
import { useSyncStatus } from "./mud/useSyncStatus";
import { usePlayerPositionQuery } from "./common/usePlayerPositionQuery";
import { AccountName } from "./common/AccountName";
import { useDustClient } from "./common/useDustClient";
import { gpcPreVerify } from "@pcd/gpc";
import * as p from "@parcnet-js/podspec";
import { useMutation } from "@tanstack/react-query";
import { ProtoPODGPC } from "@pcd/gpcircuits";
import { ticketProofRequest } from "@parcnet-js/ticket-spec";
import { connect, ParcnetAPI, type Zapp } from "@parcnet-js/app-connector";
import { useState } from "react";
import { encodeAbiParameters, type Hex } from "viem";
import { encodePlayer, objectsByName } from "@dust/world/internal";
import IWorldAbi from "@dust/world/out/IWorld.sol/IWorld.abi";
import { resourceToHex } from "@latticexyz/common";
import { decodeError } from "./common/decodeError";

const devconZapp: Zapp = {
  name: "Dust Devcon Zapp",
  permissions: {
    READ_POD: { collections: ["Devcon SEA"] },
    REQUEST_PROOF: { collections: ["Devcon SEA"] },
  },
};

// Utility function to convert string arrays to BigInt arrays
const convertToBigIntArray = (arr: string[]): bigint[] => {
  return arr.map((str) => BigInt(str));
};

// Utility function to convert nested string arrays to nested BigInt arrays
const convertToBigIntNestedArray = (arr: string[][]): bigint[][] => {
  return arr.map((subArr) => subArr.map((str) => BigInt(str)));
};

export default function App() {
  const { data: dustClient } = useDustClient();
  const [z, setZ] = useState<ParcnetAPI | null>(null);
  const syncStatus = useSyncStatus();
  const playerStatus = usePlayerStatus();
  const playerPosition = usePlayerPositionQuery();

  const connectZupass = useMutation({
    mutationFn: async () => {
      if (!dustClient) throw new Error("Dust client not connected");
      const element = document.getElementById(
        "zpass-app-connector"
      ) as HTMLElement;

      if (!element) {
        throw new Error("Zupass connector element not found");
      }

      const clientUrl = "https://zupass.org";

      const zCon = await connect(devconZapp, element, clientUrl);
      setZ(zCon);
    },
  });

  const claimIron = useMutation({
    mutationFn: async () => {
      if (!dustClient) throw new Error("Dust client not connected");
      if (!z) throw new Error("Zupass not connected");

      const request = ticketProofRequest({
        classificationTuples: [
          {
            // Devcon 7
            signerPublicKey: "YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs",
            eventId: "5074edf5-f079-4099-b036-22223c0c6995",
          },
        ],
        fieldsToReveal: {
          // The proof will reveal if the ticket has been consumed
          ticketId: true,
          productId: true,
        },
        externalNullifier: {
          type: "string",
          value: "dust-devcon-iron-bar-claim",
        },
      });

      const gpcProof = await z.gpc.prove({ request: request.schema });
      console.log("Got GPC proof:", gpcProof);
      if (!gpcProof.success) {
        throw new Error(`Failed to get valid GPC proof ${gpcProof.error}`);
      }
      const boundConfig = gpcProof.boundConfig;
      const revealedClaims = gpcProof.revealedClaims;
      const circuit = gpcPreVerify(boundConfig, revealedClaims);
      console.log("Pre-verified GPC proof:", circuit);
      const pubSignals = ProtoPODGPC.makePublicSignals(
        circuit.circuitPublicInputs,
        circuit.circuitOutputs
      );

      const reversedPiB: [any[], any[]] = [
        gpcProof.proof.pi_b[0]?.slice().reverse() || [],
        gpcProof.proof.pi_b[1]?.slice().reverse() || [],
      ];

      const convertedProof = {
        pi_a: convertToBigIntArray(gpcProof.proof.pi_a.slice(0, -1)), // Remove last element
        pi_b: convertToBigIntNestedArray(reversedPiB),
        pi_c: convertToBigIntArray(gpcProof.proof.pi_c.slice(0, -1)), // Remove last element
        pubSignals: pubSignals,
      };
      console.log("Converted proof:", convertedProof);
      // print public signals as an array string
      // console.log(
      //   "Public signals:",
      //   `[${convertedProof.pubSignals.map((x) => x.toString()).join(",\n")}]`
      // );

      const chestEntityId = dustClient?.appContext.via?.entity;
      const userAddress = dustClient?.appContext.userAddress;
      const userEntityId = userAddress ? encodePlayer(userAddress) : undefined;
      if (!chestEntityId || !userEntityId) {
        throw new Error("Missing chest or user entity ID");
      }

      const chestSlots = await dustClient.provider.request({
        method: "getSlots",
        params: {
          entity: chestEntityId as Hex,
          objectType: objectsByName.VinesBush.id,
          amount: 1,
          operationType: "deposit",
        },
      });

      const userSlots = await dustClient.provider.request({
        method: "getSlots",
        params: {
          entity: userEntityId as Hex,
          objectType: objectsByName.VinesBush.id,
          amount: 1,
          operationType: "withdraw",
        },
      });

      const transferRes = await dustClient.provider.request({
        method: "systemCall",
        params: [
          {
            systemId: resourceToHex({
              type: "system",
              namespace: "",
              name: "TransferSystem",
            }),
            abi: IWorldAbi,
            functionName: "transfer",
            args: [
              userEntityId,
              userEntityId,
              chestEntityId,
              [
                {
                  slotFrom: userSlots.slots[0].slot,
                  slotTo: chestSlots.slots[0].slot,
                  amount: BigInt(1),
                },
              ],
              encodeAbiParameters(
                [
                  {
                    type: "tuple",
                    components: [
                      { name: "_pA", type: "uint256[2]" },
                      { name: "_pB", type: "uint256[2][2]" },
                      { name: "_pC", type: "uint256[2]" },
                      { name: "_pubSignals", type: "uint256[126]" },
                    ],
                  },
                ],
                [
                  {
                    _pA: convertedProof.pi_a as [bigint, bigint],
                    _pB: convertedProof.pi_b as [
                      [bigint, bigint],
                      [bigint, bigint],
                    ],
                    _pC: convertedProof.pi_c as [bigint, bigint],
                    _pubSignals:
                      convertedProof.pubSignals as readonly bigint[] & {
                        length: 126;
                      },
                  },
                ]
              ),
            ],
          },
        ],
      });

      const transferErrorMessage = decodeError(IWorldAbi, transferRes.receipt);
      if (transferErrorMessage) {
        throw new Error(transferErrorMessage);
      }
      return transferRes;
    },
  });

  if (!dustClient) {
    const url = `https://alpha.dustproject.org?debug-app=${window.location.origin}/dust-app.json`;
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <a href={url} className="text-center text-blue-500 underline">
          Open this page in DUST to connect to dustkit
        </a>
      </div>
    );
  }

  if (!syncStatus.isLive || !playerStatus) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-center">Syncing ({syncStatus.percentage}%)...</p>
      </div>
    );
  }

  return (
    <div>
      <p>
        Hello <AccountName address={dustClient.appContext.userAddress} />
      </p>
      {playerPosition.data && (
        <p>Your position: {JSON.stringify(playerPosition.data, null, " ")}</p>
      )}
      {playerStatus && <p>Your status: {playerStatus}</p>}
      {!z && (
        <>
          <button
            onClick={() => connectZupass.mutate()}
            disabled={connectZupass.isPending}
            className="bg-blue-500 text-white p-2"
          >
            {connectZupass.isPending ? "Connecting..." : "Connect Zupass"}
          </button>
          {connectZupass.error && (
            <p className="text-red-500">{String(connectZupass.error)}</p>
          )}
        </>
      )}
      {z && (
        <>
          <button
            onClick={() => claimIron.mutate()}
            disabled={claimIron.isPending}
            className="bg-blue-500 text-white p-2"
          >
            {claimIron.isPending ? "Claiming..." : "Claim Iron Bar"}
          </button>
          {claimIron.error && (
            <p className="text-red-500">{String(claimIron.error)}</p>
          )}
        </>
      )}
    </div>
  );
}
