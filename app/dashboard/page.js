"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [keyCount, setKeyCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [depositCount, setDepositCount] = useState(0);

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
          .select("id", { count: "exact", head: true })
          .eq("user_id", currentUser.id),

        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", currentUser.id),

        supabase
          .from("deposit_requests")
          .select("id", { count: "exact", head: true })
          .eq("user_id", currentUser.id),
      ]);

      if (walletResult.error) {
        console.error("WALLET ERROR:", walletResult.error);
      }

      if (keysResult.error) {
        console.error("KEY COUNT ERROR:", keysResult.error);
      }

      if (ordersResult.error) {
        console.error("ORDER COUNT ERROR:", ordersResult.error);
      }

      if (depositsResult.error) {
        console.error("DEPOSIT COUNT ERROR:", depositsResult.error);
      }

      setWallet(walletResult.data || null);
      setKeyCount(keysResult.count || 0);
      setOrderCount(ordersResult.count || 0);
      setDepositCount(depositsResult.count || 0);
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

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          <div style={styles.loadingIcon}>X</div>
          <div>Đang tải tài khoản...</div>
        </div>
      </main>
    );
  }

  if (message) {
    return (
      <main style={styles.page}>
        <div style={styles.errorPage}>
          <div style={styles.errorIcon}>🔐</div>
          <h2>Chưa đăng nhập</h2>
          <p>{message}</p>

          <Link href="/login" style={styles.primaryButton}>
            ĐĂNG NHẬP
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlow} />

      <div style={styles.container}>
        <section style={styles.hero}>
          <div>
            <div style={styles.badge}>XENOVA PLAY</div>

            <h1 style={styles.title}>
              Xin chào 👋
            </h1>

            <p style={styles.email}>
              {user?.email}
            </p>
          </div>

          <div style={styles.accountIcon}>
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
        </section>

        <section style={styles.walletCard}>
          <div style={styles.walletTop}>
            <div>
              <div style={styles.walletLabel}>
                SỐ DƯ VÍ
              </div>

              <div style={styles.balance}>
                {formatMoney(wallet?.balance)}
              </div>
            </div>

            <div style={styles.walletIcon}>
              💰
            </div>
          </div>

          <div style={styles.walletBottom}>
            <span>
              Dùng số dư để mua KEY
            </span>

            <Link
              href="/deposit"
              style={styles.depositButton}
            >
              + NẠP TIỀN
            </Link>
          </div>
        </section>

        <section style={styles.stats}>
          <StatCard
            icon="🔑"
            value={keyCount}
            label="KEY của tôi"
          />

          <StatCard
            icon="📦"
            value={orderCount}
            label="Đơn hàng"
          />

          <StatCard
            icon="💳"
            value={depositCount}
            label="Lần nạp tiền"
          />
        </section>

        <section>
          <h2 style={styles.sectionTitle}>
            Thao tác nhanh
          </h2>

          <div style={styles.actions}>
            <ActionCard
              href="/shop"
              icon="🛒"
              title="Cửa hàng"
              text="Mua KEY"
            />

            <ActionCard
              href="/keys"
              icon="🔑"
              title="KEY của tôi"
              text="Xem KEY đã mua"
            />

            <ActionCard
              href="/orders"
              icon="📦"
              title="Đơn hàng"
              text="Lịch sử giao dịch"
            />

            <ActionCard
              href="/deposit"
              icon="💰"
              title="Nạp tiền"
              text="Nạp vào ví"
            />

            <ActionCard
              href="/settings"
              icon="⚙️"
              title="Cài đặt"
              text="Quản lý tài khoản"
            />
          </div>
        </section>

        <section style={styles.infoCard}>
          <div style={styles.infoIcon}>🛡️</div>

          <div>
            <h3 style={styles.infoTitle}>
              Tài khoản của bạn
            </h3>

            <p style={styles.infoText}>
              Tài khoản được bảo vệ bằng hệ thống xác thực
              của XENOVA PLAY. Không chia sẻ mật khẩu cho
              người khác.
            </p>
          </div>
        </section>

        <div style={styles.bottomLinks}>
          <Link href="/">Trang chủ</Link>
          <Link href="/shop">Cửa hàng</Link>
          <Link href="/keys">KEY</Link>
          <Link href="/orders">Đơn hàng</Link>
        </div>
      </div>
    </main>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>

      <div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

function ActionCard({ href, icon, title, text }) {
  return (
    <Link href={href} style={styles.actionCard}>
      <div style={styles.actionIcon}>{icon}</div>

      <div style={{ flex: 1 }}>
        <div style={styles.actionTitle}>
          {title}
        </div>

        <div style={styles.actionText}>
          {text}
        </div>
      </div>

      <div style={styles.arrow}>›</div>
    </Link>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top, #111d36 0%, #070b12 45%, #040609 100%)",
    color: "#fff",
    padding: "30px 15px 60px",
  },

  backgroundGlow: {
    position: "fixed",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "rgba(36, 105, 255, .07)",
    filter: "blur(100px)",
    top: "-180px",
    left: "50%",
    transform: "translateX(-50%)",
    pointerEvents: "none",
  },

  container: {
    width: "100%",
    maxWidth: "950px",
    margin: "0 auto",
    position: "relative",
    zIndex: 2,
  },

  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
  },

  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#101b30",
    border: "1px solid #263c65",
    color: "#72a9ff",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "2px",
  },

  title: {
    margin: "10px 0 4px",
    fontSize: "clamp(27px, 5vw, 38px)",
    fontWeight: "950",
  },

  email: {
    margin: 0,
    color: "#78869c",
    fontSize: "13px",
    wordBreak: "break-all",
  },

  accountIcon: {
    width: "58px",
    height: "58px",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: "16px",
    background: "#15243c",
    border: "1px solid #2b456d",
    color: "#72a9ff",
    fontSize: "20px",
    fontWeight: "900",
  },

  walletCard: {
    padding: "22px",
    borderRadius: "18px",
    background:
      "linear-gradient(135deg, #10203a 0%, #0c1523 100%)",
    border: "1px solid #29466f",
    boxShadow: "0 20px 60px rgba(0,0,0,.25)",
    marginBottom: "15px",
  },

  walletTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },

  walletLabel: {
    color: "#71819a",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1.5px",
  },

  balance: {
    marginTop: "7px",
    fontSize: "clamp(28px, 6vw, 42px)",
    fontWeight: "950",
  },

  walletIcon: {
    width: "55px",
    height: "55px",
    display: "grid",
    placeItems: "center",
    borderRadius: "15px",
    background: "#172b48",
    fontSize: "24px",
  },

  walletBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    marginTop: "20px",
    paddingTop: "15px",
    borderTop: "1px solid #203651",
    color: "#718098",
    fontSize: "12px",
  },

  depositButton: {
    padding: "10px 14px",
    borderRadius: "9px",
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontSize: "11px",
    fontWeight: "900",
  },

  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "30px",
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "17px",
    borderRadius: "14px",
    background: "#0d1420",
    border: "1px solid #202d42",
  },

  statIcon: {
    width: "42px",
    height: "42px",
    display: "grid",
    placeItems: "center",
    borderRadius: "11px",
    background: "#141f31",
    fontSize: "19px",
  },

  statValue: {
    fontSize: "22px",
    fontWeight: "950",
  },

  statLabel: {
    marginTop: "2px",
    color: "#718097",
    fontSize: "11px",
  },

  sectionTitle: {
    margin: "0 0 13px",
    fontSize: "17px",
    fontWeight: "900",
  },

  actions: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "10px",
  },

  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minHeight: "68px",
    padding: "0 14px",
    borderRadius: "13px",
    background: "#0d1420",
    border: "1px solid #202d42",
    color: "#fff",
    textDecoration: "none",
  },

  actionIcon: {
    width: "40px",
    height: "40px",
    display: "grid",
    placeItems: "center",
    borderRadius: "10px",
    background: "#141f31",
    fontSize: "18px",
  },

  actionTitle: {
    fontSize: "13px",
    fontWeight: "850",
  },

  actionText: {
    marginTop: "3px",
    color: "#6f7c91",
    fontSize: "10px",
  },

  arrow: {
    color: "#526078",
    fontSize: "23px",
  },

  infoCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "13px",
    marginTop: "20px",
    padding: "17px",
    borderRadius: "14px",
    background: "#0b111b",
    border: "1px solid #1d2a3c",
  },

  infoIcon: {
    fontSize: "22px",
  },

  infoTitle: {
    margin: "0 0 5px",
    fontSize: "13px",
  },

  infoText: {
    margin: 0,
    color: "#68758a",
    fontSize: "11px",
    lineHeight: 1.6,
  },

  bottomLinks: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "20px",
    marginTop: "30px",
  },

  loading: {
    minHeight: "70vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: "12px",
    color: "#8491a5",
    fontSize: "13px",
  },

  loadingIcon: {
    width: "48px",
    height: "48px",
    display: "grid",
    placeItems: "center",
    borderRadius: "14px",
    background: "#13223a",
    color: "#72a9ff",
    fontWeight: "950",
    fontSize: "18px",
  },

  errorPage: {
    maxWidth: "400px",
    margin: "15vh auto 0",
    padding: "30px 20px",
    textAlign: "center",
    borderRadius: "18px",
    background: "#0d1420",
    border: "1px solid #202d42",
  },

  errorIcon: {
    fontSize: "45px",
  },

  primaryButton: {
    display: "inline-block",
    marginTop: "15px",
    padding: "12px 18px",
    borderRadius: "9px",
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontWeight: "900",
    fontSize: "12px",
  },
};
