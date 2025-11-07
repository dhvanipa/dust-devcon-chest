import { usePlayerStatus } from "./common/usePlayerStatus";
import { useSyncStatus } from "./mud/useSyncStatus";
import { usePlayerPositionQuery } from "./common/usePlayerPositionQuery";
import { AccountName } from "./common/AccountName";
import { useDustClient } from "./common/useDustClient";
import * as p from "@parcnet-js/podspec";
import { useMutation } from "@tanstack/react-query";
import { ticketProofRequest } from "@parcnet-js/ticket-spec";
import { connect, ParcnetAPI, type Zapp } from "@parcnet-js/app-connector";
import { useState } from "react";

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
