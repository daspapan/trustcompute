"use client";

import { VoucherCard } from "@/components/VoucherCard";
import { useJobCatalog, useVouchers } from "@/lib/useVouchers";
import { CONTRACT_ADDRESS } from "@/lib/contract";
import { NetworkBanner } from "@/components/NetworkBanner";

export default function MarketplacePage() {
  const { vouchers, initialLoading, refreshing, error, refresh } = useVouchers();
  const { jobs, refreshJobs } = useJobCatalog();

  const reload = () => {
    refresh();
    refreshJobs();
  };

  return (
    <>
    
      <NetworkBanner />

      <div className="page-head">
        <p className="page-head__eyebrow">TrustCompute</p>
        <h1 className="page-head__title">Trust Compute Jobs</h1>
        <p className="page-head__lede">
          The buyer knows the fingerprint of what they are buying, but not the content itself.
        </p>
      </div>

      {!CONTRACT_ADDRESS && <p className="form-error">Contract address is not configured.</p>}

      <div className="section-head">
        <p className="section-head__count">
          {vouchers.length} jobs{refreshing ? " · syncing" : ""}
        </p>
        <button onClick={reload} className="link-btn">
          Refresh
        </button>
      </div>

      {initialLoading && (
        <div className="voucher-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="voucher-card voucher-card--skeleton" aria-hidden="true" />
          ))}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {!initialLoading && vouchers.length === 0 && !error && (
        <p className="empty-state">No compute jobs published yet.</p>
      )}

      {!initialLoading && vouchers.length > 0 && (
        <div className="voucher-grid">
          {vouchers.map((v) => (
            <VoucherCard
              key={v.id.toString()}
              voucher={v}
              job={jobs[v.id.toString()]}
              onChanged={reload}
            />
          ))}
        </div>
      )}
    </>
  );
}
