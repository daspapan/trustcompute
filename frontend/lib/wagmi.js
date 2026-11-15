"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);
const chains = chainId === sepolia.id ? [sepolia] : [hardhat];

export const wagmiConfig = getDefaultConfig({
  appName: "NodeBridge",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id",
  chains,
  // Use your own RPC (e.g. Alchemy) on Sepolia; public RPCs reject large log queries.
  transports:
    chainId === sepolia.id
      ? { [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || undefined) }
      : { [hardhat.id]: http() },
  ssr: true,
});
