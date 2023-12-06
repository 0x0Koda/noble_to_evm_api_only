import { StargateClient, SigningStargateClient } from "@cosmjs/stargate";
import dotenv from "dotenv";
dotenv.config();
import {
  DirectSecp256k1HdWallet,
  OfflineDirectSigner,
} from "@cosmjs/proto-signing";
import { MsgDepositForBurn } from "./cctpProto";
//import { fromHex } from "viem";
import axios from "axios";

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

  const squidtesting = (await signer.getAccounts())[0].address;
  console.log("Squid test address address from signer", squidtesting);
  console.log(
    "Squidtest balance before:",
    await client.getAllBalances(squidtesting)
  );

  signingClient.registry.register(
    "/circle.cctp.v1.MsgDepositForBurn",
    MsgDepositForBurn
  );
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

  const headers = {
    "x-integrator-id": "Squid-team",
    "Content-Type": "application/json",
  };

  const data = {
    fromChain: "noble-1",
    fromToken: "uusdc",
    fromAddress: "noble1zqnudqmjrgh9m3ec9yztkrn4ttx7ys64p87kkx",
    fromAmount: "100000",
    toChain: "1",
    toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    toAddress: "0xb13CD07B22BC5A69F8500a1Cb3A1b65618d50B22",
    quoteOnly: false,
    slippage: 1,
    slippageConfig: {
      autoMode: 1,
    },
    enableBoost: true,
  };

  let responseData;
  await axios
    .post("https://v2.api.squidrouter.com/v2/route", data, { headers })
    .then((response) => {
      console.log(response.data);
      responseData = response.data;
    })
    .catch((error) => {
      console.error("Error:", error);
    });

  const parsedObject: Msg = JSON.parse(
    responseData.route.transactionRequest.data
  );

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
