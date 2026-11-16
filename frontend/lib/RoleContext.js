"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, ESCROW_ABI } from "@/lib/contract";
import { useJobCatalog, useVouchers } from "./useVouchers";

// Roles, highest first. A wallet gets the first role that applies to it.
//   owner  - the contract owner (Ownable.owner())
//   worker - an address the owner authorized with setWorkerAuthorization
//   seller - has listed at least one job
//   buyer  - any other connected wallet
//   guest  - no wallet connected
export const ROLE_LABELS = {
  owner: "Owner",
  worker: "Worker",
  seller: "Seller",
  buyer: "Buyer",
  guest: "Guest",
};


const RoleContext = createContext(null);

const same = (a, b) => Boolean(a && b && a.toLowerCase() === b.toLowerCase());

export function RoleProvider({ children }) {
  const { address, isConnected } = useAccount();
  const vouchersState = useVouchers();
  const catalog = useJobCatalog();

  const enabled = Boolean(CONTRACT_ADDRESS);

  const { data: owner, refetch: refetchOwner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "owner",
    query: { enabled },
  });

  const { data: isWorkerOnChain, refetch: refetchWorker } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "authorizedWorkers",
    args: address ? [address] : undefined,
    query: { enabled: enabled && Boolean(address) },
  });

  const value = useMemo(() => {
    const isOwner = isConnected && same(address, owner);
    const isWorker = isConnected && Boolean(isWorkerOnChain);
    const isSeller = isConnected && vouchersState.vouchers.some((v) => same(v.seller, address));
    const isBuyer = isConnected && vouchersState.vouchers.some((v) => same(v.buyer, address));

    let role = "guest";
    if (isOwner) role = "owner";
    else if (isWorker) role = "worker";
    else if (isSeller) role = "seller";
    else if (isConnected) role = "buyer";

    return {
      role,
      label: ROLE_LABELS[role],
      address,
      owner,
      isOwner,
      isWorker,
      isSeller,
      isBuyer,
      canOperate: isOwner || isWorker,
      vouchersState,
      catalog,
      refreshRoles: () => {
        refetchOwner();
        refetchWorker();
        vouchersState.refresh();
        catalog.refreshJobs();
      },
    };
  }, [address, isConnected, owner, isWorkerOnChain, vouchersState, catalog, refetchOwner, refetchWorker]);

  // Drive the colour theme: CSS reads <html data-role="...">.
  useEffect(() => {
    document.documentElement.dataset.role = value.role;
  }, [value.role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;

}


export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}