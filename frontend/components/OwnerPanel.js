"use client";

import { useEffect, useRef, useState } from "react";
import { formatEther, isAddress } from "viem";
import { useBalance, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESS, ESCROW_ABI } from "@/lib/contract";
import { useRole } from "@/lib/RoleContext";

const ZERO = "0x0000000000000000000000000000000000000000";
const same = (a, b) => Boolean(a && b && a.toLowerCase() === b.toLowerCase());
const short = (a) => (a && a !== ZERO ? `${a.slice(0, 6)}···${a.slice(-4)}` : "—");

// Runs a contract write and calls onDone once it is mined.
function useTx(onDone) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const notified = useRef(null);

  useEffect(() => {
    if (isSuccess && hash && notified.current !== hash) {
      notified.current = hash;
      onDone?.();
    }
  }, [isSuccess, hash, onDone]);

  return { writeContract, hash, busy: isPending || isConfirming, isSuccess, error, reset };
}

// Two-click confirm so a payout is never sent by a single stray click.
function ConfirmButton({ label, confirmLabel, className, disabled, onConfirm }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      className={className}
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

function EscrowRow({ voucher, job, me, onDone }) {
  const tx = useTx(onDone);
  // A worker or owner must never decide a job they are a party to.
  const conflict = same(me, voucher.seller) || same(me, voucher.buyer);

  const send = (functionName) =>
    tx.writeContract({ address: CONTRACT_ADDRESS, abi: ESCROW_ABI, functionName, args: [voucher.id] });

  return (
    <div className="escrow-row">
      <div className="escrow-row__info">
        <p className="escrow-row__title">
          Job {voucher.id.toString()} · {job?.title || "Compute job"}
        </p>
        <p className="escrow-row__meta">
          {formatEther(voucher.price)} ETH · seller {short(voucher.seller)} · buyer {short(voucher.buyer)}
        </p>
        {conflict && <p className="form-error">You are a party to this job, so you should not decide it.</p>}
        {tx.error && <p className="form-error">{tx.error.shortMessage || tx.error.message}</p>}
      </div>
      <div className="escrow-row__actions">
        <ConfirmButton
          className="btn btn--success"
          label={tx.busy ? "Confirming…" : "Release to seller"}
          confirmLabel="Click again to release"
          disabled={tx.busy || conflict}
          onConfirm={() => send("releaseFunds")}
        />
        <ConfirmButton
          className="btn btn--danger"
          label={tx.busy ? "Confirming…" : "Refund buyer"}
          confirmLabel="Click again to refund"
          disabled={tx.busy || conflict}
          onConfirm={() => send("refundBuyer")}
        />
      </div>
    </div>
  );
}

function WorkerAccess() {
  const [input, setInput] = useState("");
  const valid = isAddress(input.trim());
  const worker = valid ? input.trim() : undefined;

  const { data: authorized, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "authorizedWorkers",
    args: worker ? [worker] : undefined,
    query: { enabled: Boolean(worker && CONTRACT_ADDRESS) },
  });
  const tx = useTx(refetch);

  const set = (value) =>
    tx.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "setWorkerAuthorization",
      args: [worker, value],
    });

  return (
    <div className="panel">
      <h2 className="panel__title">Worker access</h2>
      <p className="panel__lede">
        Workers are service accounts, such as the backend, that may release or refund escrow. Only the owner can add or
        remove them.
      </p>
      <label className="field">
        <span className="field__label">Worker address</span>
        <input
          className="field__input field__input--mono"
          placeholder="0x…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
        />
      </label>
      {input && !valid && <p className="form-error">That is not a valid address.</p>}
      {valid && authorized !== undefined && (
        <p className={authorized ? "form-success" : "form-note"}>
          {authorized ? "This address is an authorized worker." : "This address is not a worker."}
        </p>
      )}
      <div className="admin-row">
        <button className="btn btn--primary" disabled={!valid || tx.busy || authorized === true} onClick={() => set(true)}>
          {tx.busy ? "Confirming…" : "Authorize"}
        </button>
        <ConfirmButton
          className="btn btn--danger"
          label="Revoke"
          confirmLabel="Click again to revoke"
          disabled={!valid || tx.busy || authorized !== true}
          onConfirm={() => set(false)}
        />
      </div>
      {tx.error && <p className="form-error">{tx.error.shortMessage || tx.error.message}</p>}
    </div>
  );
}

export function OwnerPanel() {
  const { role, label, address, owner, isOwner, canOperate, vouchersState, catalog, refreshRoles } = useRole();
  const { data: balance, refetch: refetchBalance } = useBalance({
    address: CONTRACT_ADDRESS,
    query: { enabled: Boolean(CONTRACT_ADDRESS) },
  });

  if (!canOperate) {
    return (
      <div className="panel">
        <h2 className="panel__title">Restricted console</h2>
        <p className="panel__lede">
          This page is for the contract owner and authorized workers. You are connected as{" "}
          {role === "guest" ? "a guest" : label.toLowerCase()}.
        </p>
      </div>
    );
  }

  const { vouchers } = vouchersState;
  const count = (state) => vouchers.filter((v) => v.stateLabel === state).length;
  const inEscrow = vouchers.filter((v) => v.stateLabel === "AwaitingDelivery");
  const onDone = () => {
    refreshRoles();
    refetchBalance();
  };

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <p className="stat__label">Held in escrow</p>
          <p className="stat__value">{balance ? formatEther(balance.value) : "…"} ETH</p>
        </div>
        <div className="stat">
          <p className="stat__label">Jobs in escrow</p>
          <p className="stat__value">{count("AwaitingDelivery")}</p>
        </div>
        <div className="stat">
          <p className="stat__label">Released</p>
          <p className="stat__value">{count("Delivered")}</p>
        </div>
        <div className="stat">
          <p className="stat__label">Refunded</p>
          <p className="stat__value">{count("Refunded")}</p>
        </div>
      </div>

      <p className="form-note">
        Contract owner {short(owner)} · you are {short(address)} ({label})
      </p>

      <div className="panel">
        <h2 className="panel__title">Escrow decisions</h2>
        <p className="panel__lede">
          A manual decision skips the Rust result check. Use it for disputes or stuck jobs; the normal path is the Verify
          page.
        </p>
        {inEscrow.length === 0 && <p className="form-note">No jobs are waiting in escrow.</p>}
        {inEscrow.map((v) => (
          <EscrowRow key={v.id.toString()} voucher={v} job={catalog.jobs[v.id.toString()]} me={address} onDone={onDone} />
        ))}
      </div>

      {isOwner && <WorkerAccess />}
    </>
  );
}
