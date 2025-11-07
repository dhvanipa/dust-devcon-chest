import { usePlayerStatus } from "./common/usePlayerStatus";
import { useSyncStatus } from "./mud/useSyncStatus";
import { AccountName } from "./common/AccountName";
import { useDustClient } from "./common/useDustClient";
import { useMutation } from "@tanstack/react-query";
import { connect, ParcnetAPI, type Zapp } from "@parcnet-js/app-connector";
import { useState } from "react";
import { encodeAbiParameters, type Hex } from "viem";
import { encodePlayer, objectsByName } from "@dust/world/internal";
import IWorldAbi from "@dust/world/out/IWorld.sol/IWorld.abi";
import { resourceToHex } from "@latticexyz/common";
import { decodeError } from "./common/decodeError";
import { getTicketProof } from "./getTicketProof";

const devconZapp: Zapp = {
  name: "Dust Devcon Zapp",
  permissions: {
    READ_POD: { collections: ["Devcon SEA"] },
    REQUEST_PROOF: { collections: ["Devcon SEA"] },
  },
};

export default function App() {
  const { data: dustClient } = useDustClient();
  const [z, setZ] = useState<ParcnetAPI | null>(null);
  const syncStatus = useSyncStatus();
  const playerStatus = usePlayerStatus();

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
      const chestEntityId = dustClient?.appContext.via?.entity;
      const userAddress = dustClient?.appContext.userAddress;
      const userEntityId = userAddress ? encodePlayer(userAddress) : undefined;
      if (!chestEntityId || !userEntityId) {
        throw new Error("Missing chest or user entity ID");
      }

      const ticketProof = await getTicketProof(z);

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
                [ticketProof]
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

  const handleAddWaypoint = async () => {
    if (!dustClient) {
      throw new Error("Could not connect to Dust client");
    }
    console.log("requesting marker");
    await dustClient.provider.request({
      method: "setWaypoint",
      params: {
        entity:
          "0x03000000390000003fffffffa900000000000000000000000000000000000000",
        label: "Devcon Chest",
      },
    });
  };

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

  if (!dustClient.appContext.via) {
    return (
      <div>
        <p>
          Hello <AccountName address={dustClient.appContext.userAddress} />
        </p>
        <p>
          Head to{" "}
          <button
            type="button"
            className="underline"
            onClick={handleAddWaypoint}
          >
            (57, 63, -87)
          </button>{" "}
          to use the Devcon Chest
        </p>
      </div>
    );
  }

  return (
    <div>
      <p>
        Hello <AccountName address={dustClient.appContext.userAddress} />
      </p>
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
          {claimIron.isSuccess && <p>Successfully claimed iron bar!</p>}
          {claimIron.error && (
            <p className="text-red-500">{String(claimIron.error)}</p>
          )}
        </>
      )}
    </div>
  );
}
