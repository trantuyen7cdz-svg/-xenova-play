"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [keys, setKeys] = useState([]);
  const [orders, setOrders] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        setMessage("Vui lòng đăng nhập để xem tài khoản.");
        setLoading(false);
        return;
      }

      setUser(currentUser);

      const [
        walletResult,
        keysResult,
        ordersResult,
        depositsResult,
      ] = await Promise.all([
        supabase
          .from("wallets")
          .select("id, user_id, balance, created_at, updated_at")
          .eq("user_id", currentUser.id)
          .maybeSingle(),

        supabase
          .from("keys")
          .select(`
            id,
            key_code,
            product_id,
            user_id,
            expires_at,
            status,
            created_at,
            order_id,
            sold_at,
            products (
              id,
              name,
              price,
              duration_days
            )
          `)
          .eq("user_id", currentUser.id)
          .order("id", { ascending: false })
          .limit(5),

        supabase
          .from("orders")
          .select(`
            id,
            product_id,
            amount,
            status,
            created_at,
            updated_at,
            transaction_id,
            products (
              id,
              name,
              duration_days
            )
          `)
          .eq("user_id", currentUser.id)
          .order("id", { ascending: false })
          .limit(5),

        supabase
          .from("deposit_requests")
          .select(`
            id,
            amount,
            status,
            transfer_content,
            created_at,
            updated_at
          `)
          .eq("user_id", currentUser.id)
          .order("id", { ascending: false })
          .limit(5),
      ]);

      if (walletResult.error) {
        console.error("WALLET ERROR:", walletResult.error);
      }

      if (keysResult.error) {
        console.error("KEYS ERROR:", keysResult.error);
      }

      if (ordersResult.error) {
        console.error("ORDERS ERROR:", ordersResult.error);
      }

      if (depositsResult.error) {
        console.error("DEPOSITS ERROR:", depositsResult.error);
      }

      setWallet(walletResult.data || null);
      setKeys(keysResult.data || []);
      setOrders(ordersResult.data || []);
      setDeposits(depositsResult.data || []);
    } catch (error) {
      console.error("DASHBOARD ERROR:", error);
      setMessage("Không thể tải dữ liệu tài khoản.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function getDepositStatus(status) {
    if (status === "completed") {
      return {
        text: "ĐÃ DUYỆT",
        bg: "#12351f",
        color: "#55e58a",
      };
    }

    if (status === "pending") {
      return {
        text: "CHỜ DUYỆT",
        bg: "#352d12",
        color: "#ffd866",
      };
    }

    return {
      text: "ĐÃ TỪ CHỐI",
      bg: "#35171a",
      color: "#ff777d",
    };
  }

  function getOrderStatus(status) {
    if (status === "completed") {
      return {
        text: "HOÀN TẤT",
        bg: "#12351f",
        color: "#55e58a",
      };
    }

    if (status === "pending" || status === "waiting") {
      return {
        text: "ĐANG XỬ LÝ",
        bg: "#352d12",
        color: "#ffd866",
      };
    }

    return {
      text: "ĐÃ HỦY",
      bg: "#35171a",
      color: "#ff777d",
    };
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              👤 TÀI KHOẢN
            </h1>

            <p style={styles.subtitle}>
              Quản lý số dư, KEY và đơn hàng của bạn.
            </p>
          </div>

          <button
            style={styles.menuButton}
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("xenova-open-menu")
              );
            }}
          >
            ☰
          </button>
        </header>

        {loading && (
          <div style={styles.loading}>
            Đang tải dữ liệu tài khoản...
          </div>
        )}

        {!loading && message && (
          <div style={styles.error}>
            {message}

            <Link href="/login" style={styles.loginButton}>
              ĐĂNG NHẬP
            </Link>
          </div>
        )}

        {!loading && !message && user && (
          <>
            {/* ACCOUNT */}
            <section style={styles.accountCard}>
              <div style={styles.avatar}>
                {user.email?.charAt(0).toUpperCase() || "U"}
              </div>

              <div style={{ flex: 1 }}>
                <div style={styles.smallText}>
                  TÀI KHOẢN
                </div>

                <div style={styles.email}>
                  {user.email}
                </div>

                <div style={styles.userId}>
                  ID: {user.id.slice(0, 8)}...
                </div>
              </div>

              <Link
                href="/deposit"
                style={styles.depositButton}
              >
                💰 NẠP TIỀN
              </Link>
            </section>

            {/* STATS */}
            <section style={styles.statsGrid}>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  💰
                </div>

                <div>
                  <div style={styles.statLabel}>
                    SỐ DƯ
                  </div>

                  <div style={styles.statValue}>
                    {formatMoney(wallet?.balance)}
                  </div>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  🔑
                </div>

                <div>
                  <div style={styles.statLabel}>
                    KEY CỦA TÔI
                  </div>

                  <div style={styles.statValue}>
                    {keys.length}
                  </div>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  📦
                </div>

                <div>
                  <div style={styles.statLabel}>
                    ĐƠN HÀNG
                  </div>

                  <div style={styles.statValue}>
                    {orders.length}
                  </div>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  💳
                </div>

                <div>
                  <div style={styles.statLabel}>
                    LẦN NẠP
                  </div>

                  <div style={styles.statValue}>
                    {deposits.length}
                  </div>
                </div>
              </div>

            </section>

            {/* QUICK ACTIONS */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>
                    ⚡ Thao tác nhanh
                  </h2>

                  <p style={styles.sectionSub}>
                    Truy cập nhanh các chức năng chính.
                  </p>
                </div>
              </div>

              <div style={styles.actionGrid}>

                <Link
                  href="/shop"
                  style={styles.actionCard}
                >
                  <span style={styles.actionIcon}>
                    🛒
                  </span>

                  <span>
                    <strong>Mua KEY</strong>
                    <small>
                      Chọn sản phẩm và mua bằng số dư
                    </small>
                  </span>
                </Link>

                <Link
                  href="/keys"
                  style={styles.actionCard}
                >
                  <span style={styles.actionIcon}>
                    🔑
                  </span>

                  <span>
                    <strong>KEY của tôi</strong>
                    <small>
                      Xem các KEY đã mua
                    </small>
                  </span>
                </Link>

                <Link
                  href="/orders"
                  style={styles.actionCard}
                >
                  <span style={styles.actionIcon}>
                    📦
                  </span>

                  <span>
                    <strong>Đơn hàng</strong>
                    <small>
                      Xem lịch sử mua hàng
                    </small>
                  </span>
                </Link>

                <Link
                  href="/deposit"
                  style={styles.actionCard}
                >
                  <span style={styles.actionIcon}>
                    💰
                  </span>

                  <span>
                    <strong>Nạp tiền</strong>
                    <small>
                      Nạp tiền vào ví XENOVA
                    </small>
                  </span>
                </Link>

              </div>
            </section>

            {/* KEYS */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>
                    🔑 KEY gần đây
                  </h2>

                  <p style={styles.sectionSub}>
                    Các KEY mới nhất trong tài khoản.
                  </p>
                </div>

                <Link
                  href="/keys"
                  style={styles.viewAll}
                >
                  XEM TẤT CẢ →
                </Link>
              </div>

              {keys.length === 0 ? (
                <div style={styles.empty}>
                  Bạn chưa có KEY nào.
                </div>
              ) : (
                <div style={styles.list}>
                  {keys.map((key) => (
                    <div
                      key={key.id}
                      style={styles.item}
                    >
                      <div style={styles.itemIcon}>
                        🔑
                      </div>

                      <div style={{ flex: 1 }}>
                        <strong style={styles.itemTitle}>
                          {key.products?.name ||
                            `Sản phẩm #${key.product_id}`}
                        </strong>

                        <div style={styles.itemSub}>
                          {key.key_code}
                        </div>
                      </div>

                      <div style={styles.itemRight}>
                        <span style={styles.soldBadge}>
                          ĐÃ MUA
                        </span>

                        <small>
                          {formatDate(key.created_at)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ORDERS */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>
                    📦 Đơn hàng gần đây
                  </h2>

                  <p style={styles.sectionSub}>
                    Những đơn hàng mới nhất của bạn.
                  </p>
                </div>

                <Link
                  href="/orders"
                  style={styles.viewAll}
                >
                  XEM TẤT CẢ →
                </Link>
              </div>

              {orders.length === 0 ? (
                <div style={styles.empty}>
                  Bạn chưa có đơn hàng.
                </div>
              ) : (
                <div style={styles.list}>
                  {orders.map((order) => {
                    const status = getOrderStatus(
                      order.status
                    );

                    return (
                      <div
                        key={order.id}
                        style={styles.item}
                      >
                        <div style={styles.itemIcon}>
                          📦
                        </div>

                        <div style={{ flex: 1 }}>
                          <strong style={styles.itemTitle}>
                            {order.products?.name ||
                              `Sản phẩm #${order.product_id}`}
                          </strong>

                          <div style={styles.itemSub}>
                            Đơn #{order.id} •{" "}
                            {formatDate(order.created_at)}
                          </div>
                        </div>

                        <div style={styles.orderRight}>
                          <strong>
                            {formatMoney(order.amount)}
                          </strong>

                          <span
                            style={{
                              ...styles.status,
                              background: status.bg,
                              color: status.color,
                            }}
                          >
                            {status.text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* DEPOSITS */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>
                    💳 Nạp tiền gần đây
                  </h2>

                  <p style={styles.sectionSub}>
                    Theo dõi các yêu cầu nạp tiền.
                  </p>
                </div>

                <Link
                  href="/deposit"
                  style={styles.viewAll}
                >
                  NẠP TIỀN →
                </Link>
              </div>

              {deposits.length === 0 ? (
                <div style={styles.empty}>
                  Bạn chưa có giao dịch nạp tiền.
                </div>
              ) : (
                <div style={styles.list}>
                  {deposits.map((deposit) => {
                    const status = getDepositStatus(
                      deposit.status
                    );

                    return (
                      <div
                        key={deposit.id}
                        style={styles.item}
                      >
                        <div style={styles.itemIcon}>
                          💳
                        </div>

                        <div style={{ flex: 1 }}>
                          <strong style={styles.itemTitle}>
                            Nạp tiền #{deposit.id}
                          </strong>

                          <div style={styles.itemSub}>
                            {formatDate(
                              deposit.created_at
                            )}
                          </div>
                        </div>

                        <div style={styles.orderRight}>
                          <strong>
                            {formatMoney(deposit.amount)}
                          </strong>

                          <span
                            style={{
                              ...styles.status,
                              background: status.bg,
                              color: status.color,
                            }}
                          >
                            {status.text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* FOOTER NAV */}
            <div style={styles.footerNav}>
              <Link href="/shop">
                🛒 Cửa hàng
              </Link>

              <Link href="/deposit">
                💰 Nạp tiền
              </Link>

              <Link href="/keys">
                🔑 KEY của tôi
              </Link>

              <Link href="/orders">
                📦 Đơn hàng
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #111d36 0%, #070b12 42%, #05070b 100%)",
    color: "#fff",
    padding: "22px 15px 60px",
  },

  container: {
    width: "100%",
    maxWidth: "1000px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "25px",
  },

  logo: {
    display: "inline-block",
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#101b30",
    border: "1px solid #263c65",
    color: "#72a9ff",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  title: {
    fontSize: "clamp(27px, 6vw, 42px)",
    margin: "12px 0 6px",
  },

  subtitle: {
    margin: 0,
    color: "#7e8ba0",
    fontSize: "14px",
  },

  menuButton: {
    width: "45px",
    height: "45px",
    borderRadius: "12px",
    border: "1px solid #26354c",
    background: "#0d1420",
    color: "#fff",
    fontSize: "22px",
    cursor: "pointer",
  },

  loading: {
    padding: "50px",
    textAlign: "center",
    background: "#0d1420",
    border: "1px solid #202d42",
    borderRadius: "17px",
    color: "#8491a5",
  },

  error: {
    padding: "20px",
    background: "#241417",
    border: "1px solid #5b292f",
    borderRadius: "15px",
    color: "#ff858c",
  },

  loginButton: {
    display: "inline-block",
    marginLeft: "12px",
    padding: "9px 12px",
    borderRadius: "8px",
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontWeight: "800",
  },

  accountCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "18px",
    background:
      "linear-gradient(135deg, #101a2b, #0b111c)",
    border: "1px solid #24334a",
    borderRadius: "18px",
    marginBottom: "15px",
  },

  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    display: "grid",
    placeItems: "center",
    background: "#17263d",
    color: "#75aaff",
    fontSize: "19px",
    fontWeight: "900",
  },

  smallText: {
    fontSize: "9px",
    color: "#64738a",
    fontWeight: "800",
    letterSpacing: "1px",
  },

  email: {
    marginTop: "3px",
    fontSize: "15px",
    fontWeight: "800",
    wordBreak: "break-all",
  },

  userId: {
    marginTop: "4px",
    fontSize: "10px",
    color: "#59677c",
  },

  depositButton: {
    padding: "11px 14px",
    borderRadius: "9px",
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontWeight: "900",
    fontSize: "11px",
    whiteSpace: "nowrap",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "12px",
    marginBottom: "25px",
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "17px",
    background: "#0d1420",
    border: "1px solid #202d42",
    borderRadius: "15px",
  },

  statIcon: {
    width: "40px",
    height: "40px",
    display: "grid",
    placeItems: "center",
    borderRadius: "11px",
    background: "#151f30",
    fontSize: "19px",
  },

  statLabel: {
    fontSize: "9px",
    color: "#64738a",
    fontWeight: "800",
    letterSpacing: ".7px",
  },

  statValue: {
    marginTop: "4px",
    fontSize: "17px",
    fontWeight: "900",
  },

  section: {
    marginTop: "25px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "12px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "19px",
  },

  sectionSub: {
    margin: "4px 0 0",
    color: "#68778d",
    fontSize: "12px",
  },

  viewAll: {
    color: "#75aaff",
    textDecoration: "none",
    fontSize: "10px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "11px",
  },

  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "15px",
    background: "#0d1420",
    border: "1px solid #202d42",
    borderRadius: "14px",
    color: "#fff",
    textDecoration: "none",
  },

  actionIcon: {
    width: "40px",
    height: "40px",
    display: "grid",
    placeItems: "center",
    borderRadius: "10px",
    background: "#151f30",
    fontSize: "19px",
  },

  actionCardStrong: {
    display: "block",
  },

  list: {
    display: "grid",
    gap: "9px",
  },

  item: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    background: "#0d1420",
    border: "1px solid #202d42",
    borderRadius: "13px",
  },

  itemIcon: {
    width: "38px",
    height: "38px",
    display: "grid",
    placeItems: "center",
    borderRadius: "10px",
    background: "#151f30",
    fontSize: "17px",
  },

  itemTitle: {
    display: "block",
    fontSize: "13px",
  },

  itemSub: {
    marginTop: "4px",
    color: "#68778d",
    fontSize: "10px",
    wordBreak: "break-all",
  },

  itemRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "5px",
    color: "#68778d",
    fontSize: "9px",
  },

  orderRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "6px",
    whiteSpace: "nowrap",
  },

  status: {
    padding: "5px 7px",
    borderRadius: "6px",
    fontSize: "8px",
    fontWeight: "900",
  },

  soldBadge: {
    padding: "5px 7px",
    borderRadius: "6px",
    background: "#12351f",
    color: "#55e58a",
    fontSize: "8px",
    fontWeight: "900",
  },

  empty: {
    padding: "25px",
    textAlign: "center",
    background: "#0d1420",
    border: "1px solid #202d42",
    borderRadius: "13px",
    color: "#68778d",
    fontSize: "13px",
  },

  footerNav: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "20px",
    marginTop: "35px",
    paddingTop: "20px",
    borderTop: "1px solid #172131",
  },
};
