"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function WebsiteAdminDepositsPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params?.slug;

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [website, setWebsite] = useState(null);
  const [deposits, setDeposits] = useState([]);

  const [filter, setFilter] = useState("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (slug) {
      loadDeposits();
    }
  }, [slug]);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      );
    }

    return session.access_token;
  }

  async function loadDeposits() {
    try {
      setLoading(true);
      setMessage("");

      const token = await getAccessToken();

      const response = await fetch(
        `/api/sites/${encodeURIComponent(
          slug
        )}/admin/deposits`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        router.replace(
          `/sites/${slug}/admin/login`
        );
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Không thể tải danh sách nạp tiền."
        );
      }

      setWebsite(data.website || null);
      setDeposits(data.deposits || []);
    } catch (error) {
      console.error(
        "LOAD WEBSITE DEPOSITS ERROR:",
        error
      );

      setMessage(
        error.message ||
          "Không thể tải danh sách nạp tiền."
      );
    } finally {
      setLoading(false);
    }
  }

  async function approveDeposit(depositId) {
    if (!depositId || processingId) {
      return;
    }

    const confirmed = window.confirm(
      "Bạn chắc chắn muốn DUYỆT đơn nạp tiền này?\n\n" +
        "Sau khi duyệt, tiền sẽ được cộng vào ví của đúng tài khoản trong website này."
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(depositId);
      setMessage("");

      const token = await getAccessToken();

      const response = await fetch(
        "/api/admin/approve-deposit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            depositId: Number(depositId),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Không thể duyệt đơn."
        );
      }

      window.alert(
        "Đã duyệt đơn và cộng tiền vào đúng ví."
      );

      await loadDeposits();
    } catch (error) {
      console.error(
        "APPROVE WEBSITE DEPOSIT ERROR:",
        error
      );

      setMessage(
        error.message ||
          "Không thể duyệt đơn nạp tiền."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectDeposit(depositId) {
    if (!depositId || processingId) {
      return;
    }

    const confirmed = window.confirm(
      "Bạn chắc chắn muốn TỪ CHỐI đơn nạp tiền này?\n\n" +
        "Đơn sẽ chuyển sang trạng thái thất bại và không cộng tiền."
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(depositId);
      setMessage("");

      const token = await getAccessToken();

      const response = await fetch(
        `/api/sites/${encodeURIComponent(
          slug
        )}/admin/deposits/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            depositId: Number(depositId),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Không thể từ chối đơn."
        );
      }

      window.alert(
        "Đã từ chối đơn nạp tiền."
      );

      await loadDeposits();
    } catch (error) {
      console.error(
        "REJECT WEBSITE DEPOSIT ERROR:",
        error
      );

      setMessage(
        error.message ||
          "Không thể từ chối đơn nạp tiền."
      );
    } finally {
      setProcessingId(null);
    }
  }

  function formatMoney(value) {
    return (
      Number(value || 0).toLocaleString("vi-VN") +
      "đ"
    );
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleString(
      "vi-VN"
    );
  }

  function getStatusLabel(status) {
    if (status === "pending") {
      return "ĐANG CHỜ";
    }

    if (status === "completed") {
      return "ĐÃ DUYỆT";
    }

    if (status === "failed") {
      return "THẤT BẠI";
    }

    return String(status || "KHÔNG RÕ");
  }

  const filteredDeposits = useMemo(() => {
    if (filter === "all") {
      return deposits;
    }

    return deposits.filter(
      (item) => item.status === filter
    );
  }, [deposits, filter]);

  const pendingCount = deposits.filter(
    (item) => item.status === "pending"
  ).length;

  const completedCount = deposits.filter(
    (item) => item.status === "completed"
  ).length;

  const failedCount = deposits.filter(
    (item) => item.status === "failed"
  ).length;

  const pendingAmount = deposits
    .filter(
      (item) => item.status === "pending"
    )
    .reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    );

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Đang tải quản lý nạp tiền...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <Link
              href={`/sites/${slug}/admin`}
              style={styles.back}
            >
              ← ADMIN
            </Link>

            <div style={styles.label}>
              QUẢN LÝ WEBSITE
            </div>

            <h1 style={styles.title}>
              {website?.name ||
                "Nạp tiền"}
            </h1>

            <div style={styles.slug}>
              /{website?.slug || slug}
            </div>
          </div>

          <button
            onClick={loadDeposits}
            disabled={loading || !!processingId}
            style={styles.refresh}
          >
            ↻ Làm mới
          </button>
        </header>

        <div style={styles.stats}>
          <Stat
            icon="⏳"
            label="ĐANG CHỜ"
            value={pendingCount}
          />

          <Stat
            icon="💰"
            label="TIỀN CHỜ DUYỆT"
            value={formatMoney(
              pendingAmount
            )}
          />

          <Stat
            icon="✅"
            label="ĐÃ DUYỆT"
            value={completedCount}
          />

          <Stat
            icon="❌"
            label="THẤT BẠI"
            value={failedCount}
          />
        </div>

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        <div style={styles.tabs}>
          <Tab
            active={filter === "pending"}
            onClick={() =>
              setFilter("pending")
            }
          >
            Đang chờ
          </Tab>

          <Tab
            active={filter === "completed"}
            onClick={() =>
              setFilter("completed")
            }
          >
            Đã duyệt
          </Tab>

          <Tab
            active={filter === "failed"}
            onClick={() =>
              setFilter("failed")
            }
          >
            Thất bại
          </Tab>

          <Tab
            active={filter === "all"}
            onClick={() =>
              setFilter("all")
            }
          >
            Tất cả
          </Tab>
        </div>

        <section style={styles.list}>
          {filteredDeposits.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                💸
              </div>

              <div style={styles.emptyTitle}>
                Không có đơn nạp tiền
              </div>

              <div style={styles.emptyText}>
                Hiện không có yêu cầu nào trong mục này.
              </div>
            </div>
          ) : (
            filteredDeposits.map((deposit) => (
              <DepositCard
                key={deposit.id}
                deposit={deposit}
                processingId={processingId}
                onApprove={approveDeposit}
                onReject={rejectDeposit}
                formatMoney={formatMoney}
                formatDate={formatDate}
                getStatusLabel={getStatusLabel}
              />
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}) {
  return (
    <div style={styles.stat}>
      <div style={styles.statIcon}>
        {icon}
      </div>

      <div>
        <div style={styles.statLabel}>
          {label}
        </div>

        <div style={styles.statValue}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}) {
  return (
    <button
      onClick={onClick}
      style={
        active
          ? styles.tabActive
          : styles.tab
      }
    >
      {children}
    </button>
  );
}

function DepositCard({
  deposit,
  processingId,
  onApprove,
  onReject,
  formatMoney,
  formatDate,
  getStatusLabel,
}) {
  const isProcessing =
    processingId === deposit.id;

  const isPending =
    deposit.status === "pending";

  return (
    <article style={styles.deposit}>
      <div style={styles.depositTop}>
        <div>
          <div style={styles.depositId}>
            #{deposit.id}
          </div>

          <div style={styles.amount}>
            {formatMoney(deposit.amount)}
          </div>
        </div>

        <div
          style={{
            ...styles.status,
            ...(deposit.status ===
            "pending"
              ? styles.statusPending
              : deposit.status ===
                "completed"
              ? styles.statusCompleted
              : styles.statusFailed),
          }}
        >
          {getStatusLabel(
            deposit.status
          )}
        </div>
      </div>

      <div style={styles.infoGrid}>
        <Info
          label="Tài khoản"
          value={
            deposit.user?.username ||
            deposit.user?.email ||
            deposit.user_id
          }
        />

        <Info
          label="Email"
          value={
            deposit.user?.email ||
            "-"
          }
        />

        <Info
          label="Nội dung chuyển khoản"
          value={
            deposit.transfer_content ||
            "-"
          }
        />

        <Info
          label="Thời gian"
          value={formatDate(
            deposit.created_at
          )}
        />
      </div>

      {deposit.note && (
        <div style={styles.note}>
          <span style={styles.noteLabel}>
            Ghi chú:
          </span>{" "}
          {deposit.note}
        </div>
      )}

      {isPending && (
        <div style={styles.actions}>
          <button
            onClick={() =>
              onApprove(deposit.id)
            }
            disabled={!!processingId}
            style={{
              ...styles.approve,
              opacity:
                isProcessing ? 0.6 : 1,
            }}
          >
            {isProcessing
              ? "ĐANG XỬ LÝ..."
              : "✓ DUYỆT"}
          </button>

          <button
            onClick={() =>
              onReject(deposit.id)
            }
            disabled={!!processingId}
            style={styles.reject}
          >
            ✕ TỪ CHỐI
          </button>
        </div>
      )}
    </article>
  );
}

function Info({
  label,
  value,
}) {
  return (
    <div style={styles.info}>
      <div style={styles.infoLabel}>
        {label}
      </div>

      <div style={styles.infoValue}>
        {value}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg,#08070c,#0d0b12)",
    color: "#fff",
    padding: "25px 15px 60px",
  },

  container: {
    width: "100%",
    maxWidth: "1000px",
    margin: "0 auto",
  },

  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    color: "#aaa",
    fontSize: "13px",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "22px",
  },

  back: {
    display: "inline-block",
    color: "#aaa",
    textDecoration: "none",
    fontSize: "10px",
    fontWeight: "900",
    marginBottom: "12px",
  },

  label: {
    color: "#ff5eb7",
    fontSize: "9px",
    fontWeight: "950",
    letterSpacing: "2px",
  },

  title: {
    margin: "4px 0 0",
    fontSize: "24px",
    fontWeight: "950",
  },

  slug: {
    color: "#68616f",
    fontSize: "10px",
    marginTop: "3px",
  },

  refresh: {
    border: "1px solid #352d3b",
    background: "#141119",
    color: "#ddd",
    padding: "10px 14px",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "900",
  },

  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: "12px",
    marginBottom: "16px",
  },

  stat: {
    padding: "16px",
    borderRadius: "14px",
    border: "1px solid #29232f",
    background: "#111016",
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  statIcon: {
    fontSize: "21px",
  },

  statLabel: {
    color: "#77717f",
    fontSize: "9px",
    fontWeight: "900",
  },

  statValue: {
    marginTop: "4px",
    fontSize: "18px",
    fontWeight: "950",
  },

  message: {
    marginBottom: "15px",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #5b2948",
    background: "#24111d",
    color: "#ff9dcd",
    fontSize: "11px",
  },

  tabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "15px",
  },

  tab: {
    border: "1px solid #302936",
    background: "#111016",
    color: "#8d8793",
    padding: "10px 14px",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "800",
  },

  tabActive: {
    border: "1px solid #ff5eb7",
    background: "#321526",
    color: "#ff8cc8",
    padding: "10px 14px",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "900",
  },

  list: {
    display: "grid",
    gap: "12px",
  },

  deposit: {
    padding: "18px",
    borderRadius: "15px",
    border: "1px solid #29232f",
    background: "#111016",
  },

  depositTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "15px",
  },

  depositId: {
    color: "#77717f",
    fontSize: "10px",
    fontWeight: "800",
  },

  amount: {
    marginTop: "5px",
    color: "#fff",
    fontSize: "22px",
    fontWeight: "950",
  },

  status: {
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "950",
    whiteSpace: "nowrap",
  },

  statusPending: {
    background: "#322b16",
    color: "#ffd66b",
    border: "1px solid #665520",
  },

  statusCompleted: {
    background: "#132c1d",
    color: "#72e99a",
    border: "1px solid #285c3a",
  },

  statusFailed: {
    background: "#32171b",
    color: "#ff8290",
    border: "1px solid #633039",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "10px",
    marginTop: "16px",
  },

  info: {
    padding: "10px 12px",
    borderRadius: "9px",
    background: "#0b0a0f",
    border: "1px solid #211d26",
  },

  infoLabel: {
    color: "#625c69",
    fontSize: "8px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.7px",
  },

  infoValue: {
    marginTop: "5px",
    color: "#ddd",
    fontSize: "11px",
    fontWeight: "700",
    wordBreak: "break-word",
  },

  note: {
    marginTop: "12px",
    color: "#99929f",
    fontSize: "10px",
  },

  noteLabel: {
    color: "#6f6876",
    fontWeight: "900",
  },

  actions: {
    display: "flex",
    gap: "9px",
    marginTop: "16px",
  },

  approve: {
    flex: 1,
    border: "1px solid #287144",
    background: "#15351f",
    color: "#73ef9b",
    padding: "12px",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "950",
  },

  reject: {
    flex: 1,
    border: "1px solid #633039",
    background: "#32171b",
    color: "#ff8794",
    padding: "12px",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "950",
  },

  empty: {
    padding: "60px 20px",
    borderRadius: "15px",
    border: "1px solid #29232f",
    background: "#111016",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "35px",
  },

  emptyTitle: {
    marginTop: "12px",
    fontSize: "15px",
    fontWeight: "900",
  },

  emptyText: {
    marginTop: "6px",
    color: "#6f6876",
    fontSize: "11px",
  },
};
