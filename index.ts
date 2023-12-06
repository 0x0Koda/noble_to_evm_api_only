import { StargateClient, SigningStargateClient } from "@cosmjs/stargate";
import dotenv from "dotenv";
dotenv.config();
import {
  DirectSecp256k1HdWallet,
  OfflineDirectSigner,
} from "@cosmjs/proto-signing";
import { MsgDepositForBurn } from "./cctpProto";
import { fromHex } from "viem";

const mnemonic = process.env.MNEMONIC!;
if (!mnemonic)
  throw new Error("No mnemonic provided, pls include in .env file");

const nobleRPC = "https://noble-rpc.polkachu.com";
const runAll = async (): Promise<void> => {
  const client = await StargateClient.connect(nobleRPC);
  const getSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
    return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: "noble",
    });
  };
  const signer: OfflineDirectSigner = await getSignerFromMnemonic();
  const signingClient = await SigningStargateClient.connectWithSigner(
    nobleRPC,
    signer
  );

  signingClient.registry.register(
    "/circle.cctp.v1.MsgDepositForBurn",
    MsgDepositForBurn
  );

  const squidtesting = (await signer.getAccounts())[0].address;
  console.log("Squid test address address from signer", squidtesting);

  // Check the balance of Alice and the Faucet
  console.log(
    "Squidtest balance before:",
    await client.getAllBalances(squidtesting)
  );

  //encode recipient address
  const bz = fromHex("0xb13CD07B22BC5A69F8500a1Cb3A1b65618d50B22", "bytes");
  const padded = new Uint8Array(32);
  padded.set(bz, 12);

  interface Msg {
    typeUrl: string;
    value: {
      from: string;
      amount: string;
      destinationDomain: number;
      mintRecipient: string;
      burnToken: string;
    };
  }

  const jsonString =
    '{"typeUrl":"/circle.cctp.v1.MsgDepositForBurn","value":{"from":"noble1zqnudqmjrgh9m3ec9yztkrn4ttx7ys64p87kkx","amount":"100000","destinationDomain":0,"mintRecipient":"AAAAAAAAAAAAAAAAsTzQeyK8Wmn4UAocs6G2VhjVCyI=","burnToken":"uusdc"}}';

  const parsedObject: Msg = JSON.parse(jsonString);

  // create transfer object which is an ibctranser
  //   const msg: MsgDepositForBurn = {
  //     from: "noble1zqnudqmjrgh9m3ec9yztkrn4ttx7ys64p87kkx",
  //     amount: "10000",
  //     destinationDomain: 1,
  //     mintRecipient: padded,
  //     burnToken: "uusdc",
  //   };

  const result = await signingClient.signAndBroadcast(
    // signerAddress
    squidtesting,
    [
      // message 1
      {
        typeUrl: parsedObject.typeUrl,
        value: parsedObject.value,
      },
    ],
    // the gas fee
    {
      amount: [{ denom: "uusdc", amount: "10000" }],
      gas: "250000",
    }
  );

  console.log("Transfer result:", result);
};

runAll();
