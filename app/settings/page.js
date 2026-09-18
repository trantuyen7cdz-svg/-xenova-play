"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    setLoading(true);

    const {
      data: { user: currentUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !currentUser) {
      setMessage("Vui lòng đăng nhập để sử dụng cài đặt.");
      setLoading(false);
      return;
    }

    setUser(currentUser);
    setLoading(false);
  }

  async function changePassword() {
    setMessage("");

    if (!password || !confirmPassword) {
      setMessage("Vui lòng nhập đầy đủ mật khẩu mới.");
      return;
    }

    if (password.length < 6) {
      setMessage("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(
        error.message || "Không thể đổi mật khẩu."
      );
      setChangingPassword(false);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMessage("Đổi mật khẩu thành công.");
    setChangingPassword(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Đang tải...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.empty}>
            <div style={styles.icon}>🔐</div>

            <h1>Yêu cầu đăng nhập</h1>

            <p>
              Bạn cần đăng nhập để sử dụng cài đặt tài khoản.
            </p>

            <Link
              href="/login"
              style={styles.primaryButton}
            >
              ĐĂNG NHẬP
            </Link>
          </div>
        </div>
      </main>
    );
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
              ⚙️ CÀI ĐẶT
            </h1>

            <p style={styles.subtitle}>
              Quản lý tài khoản và bảo mật.
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

        {message && (
          <div
            style={{
              ...styles.message,
              ...(message.includes("thành công")
                ? styles.success
                : styles.warning),
            }}
          >
            {message}
          </div>
        )}

        {/* ACCOUNT */}
        <section style={styles.card}>
          <div style={styles.cardTitle}>
            👤 Thông tin tài khoản
          </div>

          <div style={styles.account}>
            <div style={styles.avatar}>
              {user.email?.charAt(0).toUpperCase() || "U"}
            </div>

            <div style={{ flex: 1 }}>
              <div style={styles.label}>
                EMAIL
              </div>

              <div style={styles.email}>
                {user.email}
              </div>

              <div style={styles.id}>
                ID: {user.id}
              </div>
            </div>
          </div>
        </section>

        {/* PASSWORD */}
        <section style={styles.card}>
          <div style={styles.cardTitle}>
            🔒 Đổi mật khẩu
          </div>

          <p style={styles.description}>
            Sử dụng mật khẩu mới để bảo vệ tài khoản XENOVA.
          </p>

          <div style={styles.form}>
            <label style={styles.inputLabel}>
              Mật khẩu mới
            </label>

            <input
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              style={styles.input}
            />

            <label style={styles.inputLabel}>
              Xác nhận mật khẩu
            </label>

            <input
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              style={styles.input}
            />

            <button
              onClick={changePassword}
              disabled={changingPassword}
              style={{
                ...styles.primaryButton,
                opacity: changingPassword ? 0.6 : 1,
              }}
            >
              {changingPassword
                ? "ĐANG XỬ LÝ..."
                : "🔒 ĐỔI MẬT KHẨU"}
            </button>
          </div>
        </section>

        {/* QUICK LINKS */}
        <section style={styles.card}>
          <div style={styles.cardTitle}>
            ⚡ Truy cập nhanh
          </div>

          <div style={styles.links}>

            <Link
              href="/dashboard"
              style={styles.link}
            >
              <span>👤</span>
              <span>Tài khoản</span>
              <span style={styles.arrow}>›</span>
            </Link>

            <Link
              href="/keys"
              style={styles.link}
            >
              <span>🔑</span>
              <span>KEY của tôi</span>
              <span style={styles.arrow}>›</span>
            </Link>

            <Link
              href="/orders"
              style={styles.link}
            >
              <span>📦</span>
              <span>Đơn hàng</span>
              <span style={styles.arrow}>›</span>
            </Link>

            <Link
              href="/deposit"
              style={styles.link}
            >
              <span>💰</span>
              <span>Nạp tiền</span>
              <span style={styles.arrow}>›</span>
            </Link>

          </div>
        </section>

        {/* LOGOUT */}
        <section style={styles.logoutCard}>
          <div>
            <div style={styles.logoutTitle}>
              🚪 Đăng xuất
            </div>

            <div style={styles.logoutDescription}>
              Đăng xuất khỏi tài khoản XENOVA PLAY trên thiết bị này.
            </div>
          </div>

          <button
            onClick={logout}
            style={styles.logoutButton}
          >
            ĐĂNG XUẤT
          </button>
        </section>

        <div style={styles.footer}>
          XENOVA PLAY
        </div>
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
    maxWidth: "800px",
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
    fontSize: "clamp(27px, 6vw, 40px)",
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
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#05070b",
    color: "#8591a3",
  },

  message: {
    padding: "13px 15px",
    borderRadius: "11px",
    marginBottom: "15px",
    fontSize: "13px",
    fontWeight: "700",
  },

  success: {
    background: "#12351f",
    border: "1px solid #245d37",
    color: "#5ee58a",
  },

  warning: {
    background: "#352d12",
    border: "1px solid #5c4b1b",
    color: "#ffd866",
  },

  card: {
    background: "#0d1420",
    border: "1px solid #202d42",
    borderRadius: "17px",
    padding: "19px",
    marginBottom: "14px",
  },

  cardTitle: {
    fontSize: "16px",
    fontWeight: "900",
    marginBottom: "16px",
  },

  account: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  avatar: {
    width: "48px",
    height: "48px",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: "13px",
    background: "#172941",
    color: "#72a9ff",
    fontWeight: "900",
    fontSize: "19px",
  },

  label: {
    fontSize: "9px",
    color: "#64738a",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  email: {
    marginTop: "4px",
    fontSize: "14px",
    fontWeight: "800",
    wordBreak: "break-all",
  },

  id: {
    marginTop: "4px",
    color: "#59677c",
    fontSize: "9px",
    wordBreak: "break-all",
  },

  description: {
    color: "#738096",
    fontSize: "12px",
    marginTop: "-7px",
    marginBottom: "17px",
  },

  form: {
    display: "grid",
    gap: "9px",
  },

  inputLabel: {
    color: "#8794a8",
    fontSize: "11px",
    fontWeight: "700",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "10px",
    border: "1px solid #25354c",
    background: "#080d15",
    color: "#fff",
    outline: "none",
    fontSize: "13px",
    marginBottom: "5px",
  },

  primaryButton: {
    marginTop: "5px",
    border: "0",
    borderRadius: "10px",
    padding: "13px 16px",
    background: "#fff",
    color: "#000",
    fontWeight: "900",
    fontSize: "12px",
    cursor: "pointer",
  },

  links: {
    display: "grid",
    gap: "8px",
  },

  link: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minHeight: "48px",
    padding: "0 13px",
    borderRadius: "11px",
    background: "#080d15",
    border: "1px solid #1b2a3e",
    color: "#dce4ef",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "700",
  },

  arrow: {
    marginLeft: "auto",
    color: "#526177",
    fontSize: "21px",
  },

  logoutCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    padding: "18px",
    background: "#171013",
    border: "1px solid #422329",
    borderRadius: "17px",
  },

  logoutTitle: {
    fontWeight: "900",
    fontSize: "14px",
  },

  logoutDescription: {
    marginTop: "5px",
    color: "#806b70",
    fontSize: "10px",
  },

  logoutButton: {
    padding: "10px 13px",
    borderRadius: "9px",
    border: "1px solid #5b292f",
    background: "#241417",
    color: "#ff858c",
    fontWeight: "900",
    fontSize: "10px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  empty: {
    marginTop: "100px",
    padding: "40px 20px",
    textAlign: "center",
    background: "#0d1420",
    border: "1px solid #202d42",
    borderRadius: "17px",
  },

  icon: {
    fontSize: "45px",
  },

  empty: {
    padding: "45px 20px",
    textAlign: "center",
    background: "#0d1420",
    border: "1px solid #202d42",
    borderRadius: "17px",
  },

  footer: {
    textAlign: "center",
    marginTop: "30px",
    color: "#39475b",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "2px",
  },
};
