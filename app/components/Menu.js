"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Menu() {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [dark, setDark] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data,
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!error) {
        setUser(data?.user || null);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUser(session?.user || null);
        }
      }
    );

    const savedTheme =
      localStorage.getItem("xenova-theme");

    const isDark =
      savedTheme === "dark";

    setDark(isDark);

    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light"
    );

    setThemeReady(true);

    const handler = () => {
      setOpen(true);
    };

    window.addEventListener(
      "xenova-open-menu",
      handler
    );

    return () => {
      mounted = false;

      subscription.unsubscribe();

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

    setUser(null);
    setOpen(false);

    router.push("/");
  }

  function isActive(path) {
    if (path === "/") {
      return pathname === "/";
    }

    return (
      pathname === path ||
      pathname?.startsWith(`${path}/`)
    );
  }

  return (
    <>
      {/* =========================
          TOP MENU BUTTON
      ========================= */}

      <div
        className="global-menu-buttons"
        style={{
          display: "flex",
        }}
      >
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

      {/* =========================
          DRAWER MENU
      ========================= */}

      {open && (
        <div
          className="xenova-menu-overlay"
          onClick={() => setOpen(false)}
        >
          <aside
            className="xenova-drawer"
            onClick={(event) =>
              event.stopPropagation()
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
                onClick={() =>
                  setOpen(false)
                }
                aria-label="Đóng menu"
              >
                ×
              </button>
            </div>

            <div className="drawer-line" />

            {/* USER */}

            {user ? (
              <div className="drawer-user">
                <div className="drawer-avatar">
                  {user.email
                    ?.charAt(0)
                    .toUpperCase() || "U"}
                </div>

                <div className="drawer-user-info">
                  <small>
                    TÀI KHOẢN
                  </small>

                  <strong>
                    {user.email}
                  </strong>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="drawer-login-card"
                onClick={() =>
                  setOpen(false)
                }
              >
                <span className="drawer-login-icon">
                  🔐
                </span>

                <span>
                  <small>
                    XIN CHÀO
                  </small>

                  <strong>
                    Đăng nhập tài khoản
                  </strong>
                </span>

                <span className="drawer-arrow">
                  ›
                </span>
              </Link>
            )}

            <div className="drawer-title">
              MENU CHÍNH
            </div>

            <nav className="drawer-nav">
              <MenuLink
                href="/"
                icon="⌂"
                text="Trang chủ"
                active={isActive("/")}
                close={() =>
                  setOpen(false)
                }
              />

              <MenuLink
                href="/shop"
                icon="🛒"
                text="Cửa hàng"
                active={isActive("/shop")}
                close={() =>
                  setOpen(false)
                }
              />

              <MenuLink
                href="/deposit"
                icon="💳"
                text="Nạp tiền"
                active={isActive(
                  "/deposit"
                )}
                close={() =>
                  setOpen(false)
                }
              />

              <MenuLink
                href="/keys"
                icon="🔑"
                text="KEY của tôi"
                active={isActive("/keys")}
                close={() =>
                  setOpen(false)
                }
              />

              <MenuLink
                href="/orders"
                icon="🧾"
                text="Đơn hàng"
                active={isActive(
                  "/orders"
                )}
                close={() =>
                  setOpen(false)
                }
              />

              <MenuLink
                href="/dashboard"
                icon="👤"
                text="Tài khoản"
                active={isActive(
                  "/dashboard"
                )}
                close={() =>
                  setOpen(false)
                }
              />

              <MenuLink
                href="/settings"
                icon="⚙️"
                text="Cài đặt"
                active={isActive(
                  "/settings"
                )}
                close={() =>
                  setOpen(false)
                }
              />
            </nav>

            {/* THEME */}

            <div className="drawer-section">
              <div className="drawer-section-title">
                GIAO DIỆN
              </div>

              <button
                type="button"
                className="drawer-theme"
                onClick={toggleTheme}
              >
                <span className="drawer-theme-icon">
                  {dark ? "🌙" : "☀️"}
                </span>

                <span>
                  {dark
                    ? "Chế độ tối"
                    : "Chế độ sáng"}
                </span>

                <span className="drawer-theme-state">
                  {dark
                    ? "DARK"
                    : "LIGHT"}
                </span>
              </button>
            </div>

            {/* BOTTOM */}

            <div className="drawer-bottom">
              {user ? (
                <button
                  type="button"
                  className="drawer-logout"
                  onClick={logout}
                >
                  <span>
                    🚪
                  </span>

                  <span>
                    Đăng xuất
                  </span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="drawer-login"
                  onClick={() =>
                    setOpen(false)
                  }
                >
                  <span>
                    🔐
                  </span>

                  <span>
                    Đăng nhập
                  </span>
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* =========================
          BOTTOM TOOLBAR
      ========================= */}

      <nav
        className="mobile-bottom-bar"
        aria-label="Thanh điều hướng"
      >
        <BottomLink
          href="/"
          icon="⌂"
          label="Trang chủ"
          active={isActive("/")}
        />

        <BottomLink
          href="/shop"
          icon="🛒"
          label="Cửa hàng"
          active={isActive("/shop")}
        />

        <button
          type="button"
          className="bottom-main-button"
          onClick={() => setOpen(true)}
          aria-label="Mở menu"
        >
          <span className="bottom-menu-icon">
            ☰
          </span>

          <small>
            MENU
          </small>
        </button>

        <BottomLink
          href="/keys"
          icon="🔑"
          label="KEY"
          active={isActive("/keys")}
        />

        <BottomLink
          href={user ? "/dashboard" : "/login"}
          icon="👤"
          label={
            user
              ? "Tài khoản"
              : "Đăng nhập"
          }
          active={
            user
              ? isActive("/dashboard")
              : isActive("/login")
          }
        />
      </nav>
    </>
  );
}

function MenuLink({
  href,
  icon,
  text,
  active,
  close,
}) {
  return (
    <Link
      href={href}
      onClick={close}
      className={
        active
          ? "drawer-link active"
          : "drawer-link"
      }
    >
      <span className="drawer-link-icon">
        {icon}
      </span>

      <span className="drawer-link-text">
        {text}
      </span>

      <span className="drawer-arrow">
        ›
      </span>
    </Link>
  );
}

function BottomLink({
  href,
  icon,
  label,
  active,
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "bottom-nav-link active"
          : "bottom-nav-link"
      }
    >
      <span className="bottom-nav-icon">
        {icon}
      </span>

      <small>
        {label}
      </small>
    </Link>
  );
}
