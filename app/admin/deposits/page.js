"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default function AdminDepositsPage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  const [deposits, setDeposits] = useState([]);
  const [profiles, setProfiles] = useState([]);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    completedAmount: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // LOAD DATA
  // =========================

  async function loadData() {
    setLoading(true);

    try {
      const [
        depositsResult,
        profilesResult,
      ] = await Promise.all([
        supabase
          .from("deposit_requests")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("profiles")
          .select("id, username, email"),
      ]);

      if (depositsResult.error) {
        console.error(
          depositsResult.error
        );

        alert(
          "Không thể tải danh sách nạp tiền:\n" +
            depositsResult.error.message
        );

        return;
      }

      if (profilesResult.error) {
        console.error(
          profilesResult.error
        );
      }

      const depositData =
        depositsResult.data || [];

      const profileData =
        profilesResult.data || [];

      setDeposits(depositData);
      setProfiles(profileData);

      // =========================
      // THỐNG KÊ
      // =========================

      const pending =
        depositData.filter(
          (item) =>
            item.status === "pending"
        ).length;

      const completed =
        depositData.filter(
          (item) =>
            item.status === "completed"
        ).length;

      const failed =
        depositData.filter(
          (item) =>
            item.status === "failed"
        ).length;

      const completedAmount =
        depositData
          .filter(
            (item) =>
              item.status ===
              "completed"
          )
          .reduce(
            (total, item) =>
              total +
              Number(item.amount || 0),
            0
          );

      setStats({
        total: depositData.length,
        pending,
        completed,
        failed,
        completedAmount,
      });
    } catch (error) {
      console.error(
        "ADMIN DEPOSITS ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // FORMAT
  // =========================

  function formatMoney(value) {
    return (
      Number(value || 0).toLocaleString(
        "vi-VN"
      ) + "đ"
    );
  }

  function formatDate(value) {
    if (!value) return "-";

    return new Date(
      value
    ).toLocaleString("vi-VN");
  }

  // =========================
  // PROFILE
  // =========================

  function getProfile(userId) {
    return profiles.find(
      (profile) =>
        profile.id === userId
    );
  }

  // =========================
  // DUYỆT NẠP TIỀN
  // =========================

  async function approveDeposit(
    depositId
  ) {
    if (processing) return;

    const deposit =
      deposits.find(
        (item) =>
          item.id === depositId
      );

    if (!deposit) return;

    if (
      deposit.status !== "pending"
    ) {
      alert(
        "Yêu cầu này không còn ở trạng thái chờ."
      );

      return;
    }

    const profile =
      getProfile(deposit.user_id);

    const username =
      profile?.username ||
      profile?.email ||
      deposit.user_id;

    const confirmed =
      window.confirm(
        `XÁC NHẬN DUYỆT NẠP TIỀN\n\n` +
          `User: ${username}\n` +
          `Số tiền: ${formatMoney(
            deposit.amount
          )}\n` +
          `Mã nạp: #${deposit.id}\n\n` +
          `Hãy chắc chắn bạn đã kiểm tra giao dịch ngân hàng.`
      );

    if (!confirmed) return;

    setProcessing(depositId);

    try {
      const response = await fetch(
        "/api/admin/approve-deposit",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            depositId,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể duyệt yêu cầu."
        );
      }

      alert(
        `Đã cộng tiền thành công!\n\n` +
          `Số tiền: ${formatMoney(
            deposit.amount
          )}\n` +
          `Số dư mới: ${formatMoney(
            result.balanceAfter
          )}`
      );

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        "Không thể duyệt:\n" +
          error.message
      );
    } finally {
      setProcessing(null);
    }
  }

  // =========================
  // TỪ CHỐI
  // =========================

  async function rejectDeposit(
    depositId
  ) {
    if (processing) return;

    const deposit =
      deposits.find(
        (item) =>
          item.id === depositId
      );

    if (!deposit) return;

    if (
      deposit.status !== "pending"
    ) {
      alert(
        "Yêu cầu này không còn ở trạng thái chờ."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Xác nhận đánh dấu yêu cầu #${depositId} là THẤT BẠI?\n\n` +
          `Số tiền: ${formatMoney(
            deposit.amount
          )}`
      );

    if (!confirmed) return;

    setProcessing(depositId);

    try {
      const response = await fetch(
        "/api/admin/reject-deposit",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            depositId,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể cập nhật."
        );
      }

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        "Không thể xử lý:\n" +
          error.message
      );
    } finally {
      setProcessing(null);
    }
  }

  // =========================
  // LỌC
  // =========================

  const filteredDeposits =
    deposits.filter((deposit) => {
      const profile =
        getProfile(
          deposit.user_id
        );

      const username =
        profile?.username || "";

      const email =
        profile?.email || "";

      const searchText =
        search
          .toLowerCase()
          .trim();

      const matchesSearch =
        !searchText ||
        String(
          deposit.id
        )
          .toLowerCase()
          .includes(searchText) ||
        String(
          deposit.user_id
        )
          .toLowerCase()
          .includes(searchText) ||
        username
          .toLowerCase()
          .includes(searchText) ||
        email
          .toLowerCase()
          .includes(searchText) ||
        String(
          deposit.transfer_content ||
            ""
        )
          .toLowerCase()
          .includes(searchText);

      const matchesFilter =
        filter === "all" ||
        deposit.status === filter;

      return (
        matchesSearch &&
        matchesFilter
      );
    });

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* =========================
            HEADER
        ========================= */}

        <div style={styles.header}>
          <div>
            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              QUẢN LÝ NẠP TIỀN
            </h1>

            <p style={styles.subtitle}>
              Kiểm tra giao dịch và cộng
              tiền vào ví thành viên
            </p>
          </div>

          <button
            onClick={loadData}
            style={styles.refreshButton}
          >
            ↻ Làm mới
          </button>
        </div>

        {/* =========================
            MENU
        ========================= */}

        <div style={styles.menu}>
          <Link
            href="/admin"
            style={styles.menuItem}
          >
            Tổng quan
          </Link>

          <Link
            href="/admin/products"
            style={styles.menuItem}
          >
            Sản phẩm
          </Link>

          <Link
            href="/admin/keys"
            style={styles.menuItem}
          >
            Kho KEY
          </Link>

          <Link
            href="/admin/orders"
            style={styles.menuItem}
          >
            Đơn hàng
          </Link>

          <Link
            href="/admin/deposits"
            style={styles.menuActive}
          >
            💰 Nạp tiền
          </Link>

          <Link
            href="/admin/users"
            style={styles.menuItem}
          >
            Thành viên
          </Link>
        </div>

        {/* =========================
            STATS
        ========================= */}

        <section style={styles.statsGrid}>

          <Stat
            icon="📋"
            title="TỔNG YÊU CẦU"
            value={stats.total}
          />

          <Stat
            icon="⏳"
            title="ĐANG CHỜ"
            value={stats.pending}
          />

          <Stat
            icon="✅"
            title="HOÀN THÀNH"
            value={stats.completed}
          />

          <Stat
            icon="❌"
            title="THẤT BẠI"
            value={stats.failed}
          />

          <Stat
            icon="💰"
            title="TỔNG TIỀN ĐÃ NẠP"
            value={formatMoney(
              stats.completedAmount
            )}
          />

        </section>

        {/* =========================
            TOOLBAR
        ========================= */}

        <section style={styles.toolbar}>

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Tìm mã nạp, user, email..."
            style={styles.search}
          />

          <div style={styles.filters}>

            <button
              onClick={() =>
                setFilter("all")
              }
              style={
                filter === "all"
                  ? styles.filterActive
                  : styles.filter
              }
            >
              Tất cả
            </button>

            <button
              onClick={() =>
                setFilter("pending")
              }
              style={
                filter === "pending"
                  ? styles.filterActive
                  : styles.filter
              }
            >
              Đang chờ
            </button>

            <button
              onClick={() =>
                setFilter("completed")
              }
              style={
                filter === "completed"
                  ? styles.filterActive
                  : styles.filter
              }
            >
              Hoàn thành
            </button>

            <button
              onClick={() =>
                setFilter("failed")
              }
              style={
                filter === "failed"
                  ? styles.filterActive
                  : styles.filter
              }
            >
              Thất bại
            </button>

          </div>

        </section>

        {/* =========================
            LIST
        ========================= */}

        <section style={styles.listBox}>

          <div style={styles.listHeader}>
            DANH SÁCH YÊU CẦU
            <span>
              {filteredDeposits.length}
            </span>
          </div>

          {loading ? (
            <div style={styles.empty}>
              Đang tải...
            </div>
          ) : filteredDeposits.length ===
            0 ? (
            <div style={styles.empty}>
              Không có yêu cầu nạp tiền
            </div>
          ) : (
            <div style={styles.list}>

              {filteredDeposits.map(
                (deposit) => {
                  const profile =
                    getProfile(
                      deposit.user_id
                    );

                  const username =
                    profile?.username ||
                    "Không có username";

                  const email =
                    profile?.email ||
                    "Không có email";

                  const isProcessing =
                    processing ===
                    deposit.id;

                  return (
                    <div
                      key={deposit.id}
                      style={
                        styles.depositCard
                      }
                    >

                      {/* TOP */}

                      <div
                        style={
                          styles.cardTop
                        }
                      >
                        <div>
                          <div
                            style={
                              styles.depositId
                            }
                          >
                            NẠP TIỀN #
                            {
                              deposit.id
                            }
                          </div>

                          <div
                            style={
                              styles.date
                            }
                          >
                            {formatDate(
                              deposit.created_at
                            )}
                          </div>
                        </div>

                        <Status
                          status={
                            deposit.status
                          }
                        />
                      </div>

                      {/* BODY */}

                      <div
                        style={
                          styles.infoGrid
                        }
                      >

                        <Info
                          label="THÀNH VIÊN"
                          value={
                            username
                          }
                        />

                        <Info
                          label="EMAIL"
                          value={email}
                        />

                        <Info
                          label="SỐ TIỀN"
                          value={formatMoney(
                            deposit.amount
                          )}
                          money
                        />

                        <Info
                          label="NỘI DUNG CK"
                          value={
                            deposit.transfer_content ||
                            "-"
                          }
                          highlight
                        />

                      </div>

                      {/* NOTE */}

                      {deposit.note && (
                        <div
                          style={
                            styles.note
                          }
                        >
                          Ghi chú:{" "}
                          {
                            deposit.note
                          }
                        </div>
                      )}

                      {/* ACTION */}

                      {deposit.status ===
                        "pending" && (
                        <div
                          style={
                            styles.actions
                          }
                        >

                          <button
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              approveDeposit(
                                deposit.id
                              )
                            }
                            style={
                              styles.approveButton
                            }
                          >
                            {isProcessing
                              ? "ĐANG XỬ LÝ..."
                              : "✓ DUYỆT & CỘNG TIỀN"}
                          </button>

                          <button
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              rejectDeposit(
                                deposit.id
                              )
                            }
                            style={
                              styles.rejectButton
                            }
                          >
                            ✕ THẤT BẠI
                          </button>

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}

// =========================
// STAT
// =========================

function Stat({
  icon,
  title,
  value,
}) {
  return (
    <div style={styles.stat}>

      <div style={styles.statIcon}>
        {icon}
      </div>

      <div>
        <div style={styles.statTitle}>
          {title}
        </div>

        <div style={styles.statValue}>
          {value}
        </div>
      </div>

    </div>
  );
}

// =========================
// INFO
// =========================

function Info({
  label,
  value,
  money,
  highlight,
}) {
  return (
    <div style={styles.info}>

      <div style={styles.infoLabel}>
        {label}
      </div>

      <div
        style={{
          ...styles.infoValue,

          ...(money
            ? styles.money
            : {}),

          ...(highlight
            ? styles.highlight
            : {}),
        }}
      >
        {value}
      </div>

    </div>
  );
}

// =========================
// STATUS
// =========================

function Status({
  status,
}) {
  let text = "ĐANG CHỜ";
  let color = "#ffc107";

  if (status === "completed") {
    text = "HOÀN THÀNH";
    color = "#00e676";
  }

  if (status === "failed") {
    text = "THẤT BẠI";
    color = "#ff1744";
  }

  return (
    <div
      style={{
        ...styles.status,
        color,
        borderColor: color,
      }}
    >
      {text}
    </div>
  );
}

// =========================
// STYLES
// =========================

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #151515 0%, #050505 45%, #000 100%)",
    color: "#fff",
    padding: "25px 14px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1150px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "22px",
  },

  logo: {
    color: "#ff1744",
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "4px",
  },

  title: {
    margin: "6px 0 0",
    fontSize: "28px",
    fontWeight: "900",
  },

  subtitle: {
    color: "#777",
    margin: "6px 0 0",
    fontSize: "13px",
  },

  refreshButton: {
    background: "#151515",
    color: "#fff",
    border: "1px solid #292929",
    borderRadius: "9px",
    padding: "11px 15px",
    fontWeight: "800",
    cursor: "pointer",
  },

  menu: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "20px",
  },

  menuItem: {
    textDecoration: "none",
    color: "#aaa",
    background: "#101010",
    border: "1px solid #222",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "800",
  },

  menuActive: {
    textDecoration: "none",
    color: "#fff",
    background: "#e50932",
    border: "1px solid #e50932",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "900",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
  },

  stat: {
    background:
      "linear-gradient(145deg, #151515, #0b0b0b)",
    border: "1px solid #242424",
    borderRadius: "13px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  statIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "11px",
    background: "#1c1c1c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  statTitle: {
    color: "#777",
    fontSize: "10px",
    fontWeight: "900",
  },

  statValue: {
    fontSize: "19px",
    fontWeight: "900",
    marginTop: "4px",
  },

  toolbar: {
    marginTop: "20px",
    background: "#0b0b0b",
    border: "1px solid #222",
    borderRadius: "14px",
    padding: "15px",
  },

  search: {
    width: "100%",
    boxSizing: "border-box",
    background: "#111",
    color: "#fff",
    border: "1px solid #292929",
    borderRadius: "9px",
    padding: "13px",
    outline: "none",
    fontSize: "14px",
  },

  filters: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
    marginTop: "10px",
  },

  filter: {
    border: "1px solid #292929",
    background: "#111",
    color: "#aaa",
    padding: "9px 12px",
    borderRadius: "8px",
    fontWeight: "800",
    cursor: "pointer",
  },

  filterActive: {
    border: "1px solid #e50932",
    background: "#e50932",
    color: "#fff",
    padding: "9px 12px",
    borderRadius: "8px",
    fontWeight: "900",
    cursor: "pointer",
  },

  listBox: {
    marginTop: "20px",
    background: "#0b0b0b",
    border: "1px solid #202020",
    borderRadius: "15px",
    padding: "18px",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: "900",
    marginBottom: "14px",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  depositCard: {
    background: "#111",
    border: "1px solid #242424",
    borderRadius: "12px",
    padding: "15px",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },

  depositId: {
    fontWeight: "900",
    fontSize: "13px",
  },

  date: {
    color: "#666",
    fontSize: "11px",
    marginTop: "4px",
  },

  status: {
    border: "1px solid",
    borderRadius: "999px",
    padding: "5px 9px",
    fontSize: "9px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
    marginTop: "15px",
  },

  info: {
    background: "#0b0b0b",
    border: "1px solid #1e1e1e",
    borderRadius: "9px",
    padding: "10px",
  },

  infoLabel: {
    color: "#666",
    fontSize: "9px",
    fontWeight: "900",
  },

  infoValue: {
    color: "#ddd",
    fontSize: "12px",
    fontWeight: "800",
    marginTop: "5px",
    wordBreak: "break-word",
  },

  money: {
    color: "#00e676",
    fontSize: "15px",
  },

  highlight: {
    color: "#ff1744",
    fontFamily: "monospace",
  },

  note: {
    marginTop: "10px",
    color: "#888",
    fontSize: "11px",
  },

  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "14px",
  },

  approveButton: {
    flex: 1,
    border: "none",
    borderRadius: "9px",
    padding: "12px",
    background: "#00a854",
    color: "#fff",
    fontWeight: "900",
    cursor: "pointer",
  },

  rejectButton: {
    border: "1px solid #ff1744",
    borderRadius: "9px",
    padding: "12px 15px",
    background: "transparent",
    color: "#ff1744",
    fontWeight: "900",
    cursor: "pointer",
  },

  empty: {
    textAlign: "center",
    color: "#555",
    padding: "35px 10px",
  },
};
