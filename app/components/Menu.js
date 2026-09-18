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

    const savedTheme =
      localStorage.getItem("xenova-theme");

    const isDark = savedTheme === "dark";

    setDark(isDark);

    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light"
    );

    setThemeReady(true);

    const handler = () => setOpen(true);

    window.addEventListener(
      "xenova-open-menu",
      handler
    );

    return () => {
      window.removeEventListener(
        "xenova-open-menu",
        handler
      );
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
      <div className="global-menu-buttons">
        {themeReady && (
          <button
            type="button"
            className="global-theme-button"
            onClick={toggleTheme}
            aria-label={
              dark
                ? "Chuyển sang chế độ sáng"
                : "Chuyển sang chế độ tối"
            }
          >
            {dark ? "🌙" : "☀️"}
          </button>
        )}

        <button
          type="button"
          className="global-menu-button"
          onClick={() => setOpen(true)}
          aria-label="Mở menu"
        >
          ☰
        </button>
      </div>

      {open && (
        <div
          className="xenova-menu-overlay"
          onClick={() => setOpen(false)}
        >
          <aside
            className="xenova-drawer"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="xenova-drawer-header">
              <div className="drawer-brand">
                <div>XENOVA</div>
                <span>PLAY</span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="drawer-line" />

            {user && (
              <div className="drawer-user">
                <div className="drawer-avatar">
                  {user.email
                    ?.charAt(0)
                    .toUpperCase() || "U"}
                </div>

                <div className="drawer-user-info">
                  <small>TÀI KHOẢN</small>
                  <strong>
                    {user.email}
                  </strong>
                </div>
              </div>
            )}

            <div className="drawer-title">
              MENU
            </div>

            <nav className="drawer-nav">
              <MenuLink
                href="/"
                icon="⌂"
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
                icon="💳"
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
                icon="▣"
                text="Đơn hàng"
                close={() => setOpen(false)}
              />

              <MenuLink
                href="/dashboard"
                icon="♙"
                text="Tài khoản"
                close={() => setOpen(false)}
              />

              <MenuLink
                href="/settings"
                icon="⚙"
                text="Cài đặt"
                close={() => setOpen(false)}
              />
            </nav>

            <div className="drawer-bottom">
              {user ? (
                <button
                  type="button"
                  className="drawer-logout"
                  onClick={logout}
                >
                  🚪
                  <span>Đăng xuất</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="drawer-login"
                  onClick={() =>
                    setOpen(false)
                  }
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
      className="drawer-link"
    >
      <span className="drawer-link-icon">
        {icon}
      </span>

      <span>{text}</span>

      <span className="drawer-arrow">
        ›
      </span>
    </Link>
  );
}
