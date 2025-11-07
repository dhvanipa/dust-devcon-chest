import type { ParcnetAPI } from "@parcnet-js/app-connector";
import { ticketProofRequest } from "@parcnet-js/ticket-spec";
import { gpcPreVerify } from "@pcd/gpc";
import { ProtoPODGPC } from "@pcd/gpcircuits";

type ProofArgs = {
  _pA: [bigint, bigint];
  _pB: [[bigint, bigint], [bigint, bigint]];
  _pC: [bigint, bigint];
  _pubSignals: bigint[]; // length 126
};

// Utility function to convert string arrays to BigInt arrays
const convertToBigIntArray = (arr: string[]): bigint[] => {
  return arr.map((str) => BigInt(str));
};

// Utility function to convert nested string arrays to nested BigInt arrays
const convertToBigIntNestedArray = (arr: string[][]): bigint[][] => {
  return arr.map((subArr) => subArr.map((str) => BigInt(str)));
};

const devcon7SignerPublicKey = "YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs";
const devcon7EventId = "5074edf5-f079-4099-b036-22223c0c6995";
const externalNullifierValue = "dust-devcon-iron-bar-claim";

export async function getTicketProof(z: ParcnetAPI): Promise<ProofArgs> {
  const request = ticketProofRequest({
    classificationTuples: [
      {
        signerPublicKey: devcon7SignerPublicKey,
        eventId: devcon7EventId,
      },
    ],
    fieldsToReveal: {
      // ticketId: true,
      productId: true,
    },
    externalNullifier: {
      type: "string",
      value: externalNullifierValue,
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

  const proofArgs: ProofArgs = {
    _pA: convertToBigIntArray(gpcProof.proof.pi_a.slice(0, -1)) as [
      bigint,
      bigint,
    ], // Remove last element
    _pB: convertToBigIntNestedArray(reversedPiB) as [
      [bigint, bigint],
      [bigint, bigint],
    ],
    _pC: convertToBigIntArray(gpcProof.proof.pi_c.slice(0, -1)) as [
      bigint,
      bigint,
    ], // Remove last element
    _pubSignals: pubSignals,
  };
  console.log("Final proof args:", proofArgs);

  // print public signals as an array string
  // console.log(
  //   "Public signals:",
  //   `[${proofArgs._pubSignals.map((x) => x.toString()).join(",\n")}]`
  // );

  return proofArgs;
}
