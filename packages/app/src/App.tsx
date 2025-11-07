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

  // if (!syncStatus.isLive || !playerStatus) {
  //   return (
  //     <div className="flex flex-col h-screen items-center justify-center">
  //       <p className="text-center">Syncing ({syncStatus.percentage}%)...</p>
  //     </div>
  //   );
  // }

  if (!dustClient.appContext.via) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white p-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <img
            src="https://devcon.org/_next/image/?url=%2F_next%2Fstatic%2Fmedia%2Flogo-flowers.ab3bbdc0.png&w=1920&q=75"
            alt="Devcon 7"
            className="w-48 mx-auto mb-4"
          />
          <h2 className="text-3xl font-bold text-gray-900">
            Devcon 7 Gift Chest
          </h2>
          <p className="text-gray-600">Visit the chest to claim your gift</p>
          <button
            type="button"
            onClick={handleAddWaypoint}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200"
          >
            Set Waypoint (57, 63, -87)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src="https://devcon.org/_next/image/?url=%2F_next%2Fstatic%2Fmedia%2Flogo-flowers.ab3bbdc0.png&w=1920&q=75"
            alt="Devcon 7"
            className="w-48 mx-auto mb-4"
          />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Devcon 7 Gift Chest
          </h2>
        </div>

        {!z && (
          <div className="space-y-4">
            <button
              onClick={() => connectZupass.mutate()}
              disabled={connectZupass.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-md transition-colors duration-200"
            >
              {connectZupass.isPending ? "Connecting..." : "Connect Zupass"}
            </button>
            {connectZupass.error && (
              <p className="text-red-600 bg-red-50 border border-red-200 rounded-md p-4">
                {String(connectZupass.error)}
              </p>
            )}
          </div>
        )}

        {z && (
          <div className="space-y-4">
            <button
              onClick={() => claimIron.mutate()}
              disabled={claimIron.isPending}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-md transition-colors duration-200"
            >
              {claimIron.isPending ? "Processing..." : "Claim Gift"}
            </button>
            {claimIron.isSuccess && (
              <p className="text-green-700 bg-green-50 border border-green-200 rounded-md p-4">
                Gift claimed successfully!
              </p>
            )}
            {claimIron.error && (
              <p className="text-red-600 bg-red-50 border border-red-200 rounded-md p-4">
                {String(claimIron.error)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
