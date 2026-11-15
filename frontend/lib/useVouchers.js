"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { CONTRACT_ADDRESS, ESCROW_ABI, VOUCHER_STATE } from "@/lib/contract";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// Block the contract was deployed in. 0 is fine locally; set it on a testnet.
const DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK || 0);

export function useVouchers() {
  const publicClient = usePublicClient();
  const [vouchers, setVouchers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const hasLoadedOnce = useRef(false);

  const refresh = useCallback(async () => {
    if (!publicClient || !CONTRACT_ADDRESS) return;

    if (hasLoadedOnce.current) {
      setRefreshing(true);
    }
    setError(null);

    try {
      let ids;
      try {
        const logs = await publicClient.getContractEvents({
          address: CONTRACT_ADDRESS,
          abi: ESCROW_ABI,
          eventName: "VoucherListed",
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });
        ids = [...new Set(logs.map((log) => log.args.voucherId))];
      } catch {
        // Hosted RPCs (e.g. Alchemy free tier) cap eth_getLogs block ranges.
        // Fall back to the job IDs registered with the backend.
        const res = await fetch(`${API_URL}/jobs`);
        const data = res.ok ? await res.json() : { jobs: [] };
        ids = [...new Set((data.jobs || []).map((job) => BigInt(job.jobId)))];
      }

      const settled = await Promise.allSettled(
        ids.map(async (id) => {
          const v = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: ESCROW_ABI,
            functionName: "getVoucher",
            args: [id],
          });
          return {
            id,
            seller: v.seller,
            buyer: v.buyer,
            price: v.price,
            specHash: v.specHash,
            state: v.state,
            stateLabel: VOUCHER_STATE[v.state],
          };
        })
      );

      // Skip IDs that the backend knows but that were never listed on-chain.
      const results = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
      setVouchers(results.sort((a, b) => (a.id < b.id ? 1 : -1)));
    } catch (err) {
      setError(err.shortMessage || err.message);
    } finally {
      hasLoadedOnce.current = true;
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [publicClient]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { vouchers, initialLoading, refreshing, error, refresh };
}


export function useJobCatalog() {
  const [jobs, setJobs] = useState({});

  const refreshJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/jobs`);
      if (!res.ok) return;
      const data = await res.json();
      const map = {};
      for (const job of data.jobs || []) map[String(job.jobId)] = job;
      setJobs(map);
    } catch {
      setJobs({});
    }
  }, []);

  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  return { jobs, refreshJobs };
}
