"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function Menu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });

    const handler = () => setOpen(true);

    window.addEventListener("xenova-open-menu", handler);

    return () => {
      window.removeEventListener("xenova-open-menu", handler);
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setOpen(false);
    window.location.href = "/";
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Mở menu"
        style={styles.menuButton}
      >
        ☰
      </button>

      {open && (
        <div
          style={styles.overlay}
          onClick={() => setOpen(false)}
        >
          <aside
            style={styles.drawer}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.drawerHeader}>
              <div>
                <div style={styles.logo}>
                  XENOVA
                </div>

                <div style={styles.logoSub}>
                  PLAY
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                style={styles.close}
              >
                ×
              </button>
            </div>

            <div style={styles.line} />

            {user && (
              <div style={styles.userBox}>
                <div style={styles.avatar}>
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={styles.userLabel}>
                    TÀI KHOẢN
                  </div>

                  <div style={styles.email}>
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
              />

              <MenuLink
                href="/shop"
                icon="🛒"
                text="Cửa hàng"
                close={() => setOpen(false)}
              />

              <MenuLink
                href="/deposit"
                icon="💰"
                text="Nạp tiền"
                close={() => setOpen(false)}
              />

              <MenuLink
                href="/keys"
                icon="🔑"
                text="KEY của tôi"
                close={() => setOpen(false)}
              />

              <MenuLink
                href="/orders"
                icon="📦"
                text="Đơn hàng"
                close={() => setOpen(false)}
              />

              <MenuLink
                href="/dashboard"
                icon="👤"
                text="Tài khoản"
                close={() => setOpen(false)}
              />

              <MenuLink
                href="/settings"
                icon="⚙️"
                text="Cài đặt"
                close={() => setOpen(false)}
              />

            </nav>

            <div style={styles.bottom}>

              {user ? (
                <button
                  onClick={logout}
                  style={styles.logout}
                >
                  <span>🚪</span>
                  <span>Đăng xuất</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  style={styles.login}
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
}) {
  return (
    <Link
      href={href}
      onClick={close}
      style={styles.link}
    >
      <span style={styles.linkIcon}>
        {icon}
      </span>

      <span>
        {text}
      </span>

      <span style={styles.arrow}>
        ›
      </span>
    </Link>
  );
}

const styles = {
  menuButton: {
    position: "fixed",
    top: "16px",
    right: "16px",
    zIndex: 9990,
    width: "46px",
    height: "46px",
    borderRadius: "13px",
    border: "1px solid #26364e",
    background: "rgba(10, 16, 27, .94)",
    color: "#fff",
    fontSize: "23px",
    cursor: "pointer",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 30px rgba(0,0,0,.3)",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(0,0,0,.65)",
    backdropFilter: "blur(4px)",
  },

  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "min(88vw, 350px)",
    height: "100%",
    background:
      "linear-gradient(180deg, #0d1420 0%, #070b12 100%)",
    borderLeft: "1px solid #24344c",
    boxShadow: "-15px 0 50px rgba(0,0,0,.45)",
    padding: "22px 16px",
    overflowY: "auto",
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
    color: "#fff",
  },

  logoSub: {
    marginTop: "1px",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "4px",
    color: "#72a9ff",
  },

  close: {
    width: "40px",
    height: "40px",
    borderRadius: "11px",
    border: "1px solid #29384e",
    background: "#111a28",
    color: "#fff",
    fontSize: "27px",
    cursor: "pointer",
  },

  line: {
    height: "1px",
    background: "#1b283a",
    margin: "20px 0 15px",
  },

  userBox: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "12px",
    borderRadius: "13px",
    background: "#101a29",
    border: "1px solid #202f44",
    marginBottom: "14px",
  },

  avatar: {
    flexShrink: 0,
    width: "38px",
    height: "38px",
    display: "grid",
    placeItems: "center",
    borderRadius: "11px",
    background: "#172941",
    color: "#72a9ff",
    fontWeight: "900",
  },

  userLabel: {
    color: "#64738a",
    fontSize: "8px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  email: {
    marginTop: "3px",
    color: "#dce4ef",
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
    color: "#dbe4f0",
    textDecoration: "none",
    background: "#0d1522",
    border: "1px solid #18263a",
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
    color: "#506079",
    fontSize: "22px",
  },

  bottom: {
    marginTop: "25px",
    paddingTop: "18px",
    borderTop: "1px solid #1b283a",
  },

  logout: {
    width: "100%",
    minHeight: "50px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 14px",
    borderRadius: "12px",
    border: "1px solid #4a252b",
    background: "#211316",
    color: "#ff858c",
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
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontWeight: "900",
    fontSize: "14px",
  },
};
