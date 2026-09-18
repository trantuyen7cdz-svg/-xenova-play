"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function Menu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [dark, setDark] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });

    // Mặc định SÁNG
    const savedTheme = localStorage.getItem("xenova-theme");
    const isDark = savedTheme === "dark";

    setDark(isDark);

    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light"
    );

    setThemeReady(true);

    const handler = () => setOpen(true);

    window.addEventListener("xenova-open-menu", handler);

    return () => {
      window.removeEventListener("xenova-open-menu", handler);
    };
  }, []);

  function toggleTheme() {
    const nextDark = !dark;

    setDark(nextDark);

    document.documentElement.setAttribute(
      "data-theme",
      nextDark ? "dark" : "light"
    );

    localStorage.setItem(
      "xenova-theme",
      nextDark ? "dark" : "light"
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    setOpen(false);
    window.location.href = "/";
  }

  return (
    <>
      {/* =========================
          CỤM NÚT GÓC PHẢI
          ========================= */}

      <div style={styles.topButtons}>
        {/* NÚT SÁNG / TỐI */}

        {themeReady && (
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              dark
                ? "Chuyển sang chế độ sáng"
                : "Chuyển sang chế độ tối"
            }
            style={{
              ...styles.themeButton,
              background: dark ? "#101010" : "#ffffff",
              color: dark ? "#fff" : "#111",
              border: dark
                ? "1px solid #26364e"
                : "1px solid #d9dfe8",
              boxShadow: dark
                ? "0 8px 30px rgba(0,0,0,.3)"
                : "0 8px 30px rgba(0,0,0,.12)",
            }}
          >
            {dark ? "🌙" : "☀️"}
          </button>
        )}

        {/* MENU - LUÔN SÁT GÓC PHẢI */}

        <button
          onClick={() => setOpen(true)}
          aria-label="Mở menu"
          style={{
            ...styles.menuButton,
            background: dark
              ? "rgba(10,16,27,.94)"
              : "rgba(255,255,255,.96)",
            color: dark ? "#fff" : "#111",
            border: dark
              ? "1px solid #26364e"
              : "1px solid #d9dfe8",
            boxShadow: dark
              ? "0 8px 30px rgba(0,0,0,.3)"
              : "0 8px 30px rgba(0,0,0,.12)",
          }}
        >
          ☰
        </button>
      </div>

      {/* =========================
          DRAWER
          ========================= */}

      {open && (
        <div
          style={{
            ...styles.overlay,
            background: dark
              ? "rgba(0,0,0,.65)"
              : "rgba(0,0,0,.35)",
          }}
          onClick={() => setOpen(false)}
        >
          <aside
            style={{
              ...styles.drawer,
              background: dark
                ? "linear-gradient(180deg,#0d1420 0%,#070b12 100%)"
                : "linear-gradient(180deg,#ffffff 0%,#f5f7fa 100%)",
              borderLeft: dark
                ? "1px solid #24344c"
                : "1px solid #dce2ea",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.drawerHeader}>
              <div>
                <div
                  style={{
                    ...styles.logo,
                    color: dark ? "#fff" : "#111",
                  }}
                >
                  XENOVA
                </div>

                <div
                  style={{
                    ...styles.logoSub,
                    color: dark ? "#72a9ff" : "#246bce",
                  }}
                >
                  PLAY
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                style={{
                  ...styles.close,
                  background: dark ? "#111a28" : "#f1f3f6",
                  color: dark ? "#fff" : "#111",
                  border: dark
                    ? "1px solid #29384e"
                    : "1px solid #d9dfe8",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                ...styles.line,
                background: dark ? "#1b283a" : "#e1e5eb",
              }}
            />

            {user && (
              <div
                style={{
                  ...styles.userBox,
                  background: dark ? "#101a29" : "#f5f7fa",
                  border: dark
                    ? "1px solid #202f44"
                    : "1px solid #dce2ea",
                }}
              >
                <div
                  style={{
                    ...styles.avatar,
                    background: dark ? "#172941" : "#e8f0ff",
                    color: dark ? "#72a9ff" : "#246bce",
                  }}
                >
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      ...styles.userLabel,
                      color: dark ? "#64738a" : "#7b8798",
                    }}
                  >
                    TÀI KHOẢN
                  </div>

                  <div
                    style={{
                      ...styles.email,
                      color: dark ? "#dce4ef" : "#202733",
                    }}
                  >
                    {user.email}
                  </div>
                </div>
              </div>
            )}

            <nav style={styles.nav}>
              <MenuLink
                href="/"
                icon="🏠"
                text="Trang chủ"
                close={() => setOpen(false)}
                dark={dark}
              />

              <MenuLink
                href="/shop"
                icon="🛒"
                text="Cửa hàng"
                close={() => setOpen(false)}
                dark={dark}
              />

              <MenuLink
                href="/deposit"
                icon="💰"
                text="Nạp tiền"
                close={() => setOpen(false)}
                dark={dark}
              />

              <MenuLink
                href="/keys"
                icon="🔑"
                text="KEY của tôi"
                close={() => setOpen(false)}
                dark={dark}
              />

              <MenuLink
                href="/orders"
                icon="📦"
                text="Đơn hàng"
                close={() => setOpen(false)}
                dark={dark}
              />

              <MenuLink
                href="/dashboard"
                icon="👤"
                text="Tài khoản"
                close={() => setOpen(false)}
                dark={dark}
              />

              <MenuLink
                href="/settings"
                icon="⚙️"
                text="Cài đặt"
                close={() => setOpen(false)}
                dark={dark}
              />
            </nav>

            <div
              style={{
                ...styles.bottom,
                borderTop: dark
                  ? "1px solid #1b283a"
                  : "1px solid #e1e5eb",
              }}
            >
              {user ? (
                <button
                  onClick={logout}
                  style={{
                    ...styles.logout,
                    background: dark ? "#211316" : "#fff5f6",
                    color: dark ? "#ff858c" : "#d9363e",
                    border: dark
                      ? "1px solid #4a252b"
                      : "1px solid #f0c7cb",
                  }}
                >
                  <span>🚪</span>
                  <span>Đăng xuất</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  style={{
                    ...styles.login,
                    background: dark ? "#fff" : "#111",
                    color: dark ? "#000" : "#fff",
                  }}
                >
                  🔐 Đăng nhập
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function MenuLink({
  href,
  icon,
  text,
  close,
  dark,
}) {
  return (
    <Link
      href={href}
      onClick={close}
      style={{
        ...styles.link,
        color: dark ? "#dbe4f0" : "#202733",
        background: dark ? "#0d1522" : "#fff",
        border: dark
          ? "1px solid #18263a"
          : "1px solid #dce2ea",
      }}
    >
      <span style={styles.linkIcon}>{icon}</span>

      <span>{text}</span>

      <span
        style={{
          ...styles.arrow,
          color: dark ? "#506079" : "#9aa4b2",
        }}
      >
        ›
      </span>
    </Link>
  );
}

const styles = {
  topButtons: {
    position: "fixed",
    top: "16px",
    right: "16px",
    zIndex: 9990,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  themeButton: {
    width: "46px",
    height: "46px",
    borderRadius: "13px",
    fontSize: "21px",
    cursor: "pointer",
    backdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  menuButton: {
    width: "46px",
    height: "46px",
    borderRadius: "13px",
    fontSize: "23px",
    cursor: "pointer",
    backdropFilter: "blur(12px)",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    backdropFilter: "blur(4px)",
  },

  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "min(88vw,350px)",
    height: "100%",
    padding: "22px 16px",
    overflowY: "auto",
    boxShadow: "-15px 0 50px rgba(0,0,0,.25)",
  },

  drawerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logo: {
    fontSize: "20px",
    fontWeight: "950",
    letterSpacing: "2px",
  },

  logoSub: {
    marginTop: "1px",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "4px",
  },

  close: {
    width: "40px",
    height: "40px",
    borderRadius: "11px",
    fontSize: "27px",
    cursor: "pointer",
  },

  line: {
    height: "1px",
    margin: "20px 0 15px",
  },

  userBox: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "12px",
    borderRadius: "13px",
    marginBottom: "14px",
  },

  avatar: {
    flexShrink: 0,
    width: "38px",
    height: "38px",
    display: "grid",
    placeItems: "center",
    borderRadius: "11px",
    fontWeight: "900",
  },

  userLabel: {
    fontSize: "8px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  email: {
    marginTop: "3px",
    fontSize: "12px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "240px",
  },

  nav: {
    display: "grid",
    gap: "7px",
  },

  link: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minHeight: "52px",
    padding: "0 13px",
    borderRadius: "12px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "700",
  },

  linkIcon: {
    width: "28px",
    textAlign: "center",
    fontSize: "18px",
  },

  arrow: {
    marginLeft: "auto",
    fontSize: "22px",
  },

  bottom: {
    marginTop: "25px",
    paddingTop: "18px",
  },

  logout: {
    width: "100%",
    minHeight: "50px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 14px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "800",
    cursor: "pointer",
  },

  login: {
    display: "flex",
    alignItems: "center",
    minHeight: "50px",
    padding: "0 14px",
    borderRadius: "12px",
    textDecoration: "none",
    fontWeight: "900",
    fontSize: "14px",
  },
};
