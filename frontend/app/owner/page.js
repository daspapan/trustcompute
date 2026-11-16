"use client";

import { OwnerPanel } from "@/components/OwnerPanel";
import { useRole } from "@/lib/RoleContext";

export default function OwnerPage() {
  const { isOwner } = useRole();

  return (
    <>
      <div className="page-head">
        <p className="page-head__eyebrow">{isOwner ? "Owner" : "Console"}</p>
        <h1 className="page-head__title">{isOwner ? "Owner console" : "Operations console"}</h1>
        <p className="page-head__lede">
          See what the contract holds, settle jobs in escrow by hand, and {isOwner ? "manage worker access." : "review the queue."}
        </p>
      </div>
      <OwnerPanel />
    </>
  );
}
