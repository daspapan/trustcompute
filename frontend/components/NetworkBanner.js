"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSwitchChain } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";

const TARGET = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337) === sepolia.id ? sepolia : hardhat;
const NETWORK_NAME = TARGET.id === sepolia.id ? "Sepolia test network" : "Hardhat local network";

// Landing-page banner: tells the user to connect, or to switch to the right network.
export function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (isConnected && chainId === TARGET.id) {
    return (
      <div className="network-banner network-banner--ok" role="status">
        <span className="network-banner__dot" aria-hidden="true" />
        Connected to the {NETWORK_NAME}. You can fund and publish jobs.
      </div>
    );
  }

  const wrongNetwork = isConnected && chainId !== TARGET.id;

  return (
    <section className="network-banner" aria-labelledby="network-banner-title">
      <div>
        <h2 id="network-banner-title" className="network-banner__title">
          {wrongNetwork ? `Switch to the ${NETWORK_NAME}` : `Connect your wallet to the ${NETWORK_NAME}`}
        </h2>
        <p className="network-banner__text">
          {wrongNetwork
            ? "Your wallet is on a different network. TrustCompute only works on the " + NETWORK_NAME + "."
            : "Use MetaMask or any Ethereum wallet on the " + NETWORK_NAME + ". Test ETH only, never real funds."}
        </p>
      </div>
      {wrongNetwork ? (
        <button
          className="btn btn--primary"
          onClick={() => switchChain({ chainId: TARGET.id })}
          disabled={isPending}
        >
          {isPending ? "Switching..." : `Switch to ${TARGET.name}`}
        </button>
      ) : (
        <ConnectButton label="Connect wallet" showBalance={false} chainStatus="none" />
      )}
    </section>
  );
}
