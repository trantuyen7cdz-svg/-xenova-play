"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function formatPrice(value) {
  const number = Number(value || 0);
  return number.toLocaleString("vi-VN") + "đ";
}

function MenuLink({ href, icon, children, onClick }) {
  return (
    <Link
      href={href}
      className="xenova-menu-link"
      onClick={onClick}
    >
      <span className="xenova-menu-icon">
        {icon}
      </span>

      <span>{children}</span>
    </Link>
  );
}

export default function Menu() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [dark, setDark] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  /*
   * ==========================================
   * PHÁT HIỆN WEBSITE RIÊNG
   *
   * Ví dụ:
   * /sites/nobita
   * /sites/nobita/deposit
   * /sites/nobita/keys
   * /sites/nobita/orders
   * ==========================================
   */

  const siteMatch = pathname?.match(
    /^\/sites\/([^/]+)/
  );

  const siteSlug = siteMatch?.[1] || null;
  const isSiteMenu = Boolean(siteSlug);

  /*
   * ==========================================
   * TẠO LINK ĐÚNG THEO WEBSITE
   *
   * Website:
   * /sites/nobita
   *
   * Trang chủ / shop:
   * /sites/nobita
   *
   * Nạp tiền:
   * /sites/nobita/deposit
   * ==========================================
   */

  function sitePath(path = "") {
    if (!siteSlug) {
      return path || "/";
    }

    if (!path) {
      return `/sites/${siteSlug}`;
    }

    if (path.startsWith("/")) {
      return `/sites/${siteSlug}${path}`;
    }

    return `/sites/${siteSlug}/${path}`;
  }

  /*
   * ==========================================
   * LẤY USER
   * ==========================================
   */

  async function loadUser() {
    /*
     * WEBSITE RIÊNG
     */

    if (isSiteMenu && siteSlug) {
      try {
        const response = await fetch(
          `/api/sites/${siteSlug}/auth/me`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          !data?.success ||
          !data?.user
        ) {
          setUser(null);
          setBalance(0);
          return;
        }

        const currentUser = data.user;

        setUser(currentUser);

        await loadWallet(currentUser);
      } catch (error) {
        console.error(
          "SITE MENU USER ERROR:",
          error
        );

        setUser(null);
        setBalance(0);
      }

      return;
    }

    /*
     * SHOP CŨ
     */

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser || null);

      if (currentUser) {
        await loadWallet(currentUser);
      } else {
        setBalance(0);
      }
    } catch (error) {
      console.error(
        "MENU USER ERROR:",
        error
      );

      setUser(null);
      setBalance(0);
    }
  }

  /*
   * ==========================================
   * LẤY SỐ DƯ
   * ==========================================
   */

  async function loadWallet(currentUser) {
    if (!currentUser) {
      setBalance(0);
      return;
    }

    /*
     * WEBSITE RIÊNG
     */

    if (isSiteMenu && siteSlug) {
      try {
        const response = await fetch(
          `/api/sites/${siteSlug}/wallet`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          !data?.success
        ) {
          console.error(
            "SITE MENU WALLET API ERROR:",
            data?.message,
            data?.error
          );

          setBalance(0);
          return;
        }

        setBalance(
          Number(
            data?.wallet?.balance || 0
          )
        );
      } catch (error) {
        console.error(
          "SITE MENU WALLET ERROR:",
          error
        );

        setBalance(0);
      }

      return;
    }

    /*
     * SHOP CŨ
     */

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setBalance(0);
        return;
      }

      const response = await fetch(
        "/api/wallet/current",
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        console.error(
          "MENU WALLET API ERROR:",
          data?.message,
          data?.error
        );

        setBalance(0);
        return;
      }

      setBalance(
        Number(
          data?.wallet?.balance || 0
        )
      );
    } catch (error) {
      console.error(
        "MENU WALLET ERROR:",
        error
      );

      setBalance(0);
    }
  }

  /*
   * ==========================================
   * KHỞI TẠO
   * ==========================================
   */

  useEffect(() => {
    const savedTheme =
      localStorage.getItem(
        "xenova-theme"
      );

    if (savedTheme === "dark") {
      setDark(true);

      document.documentElement.classList.add(
        "dark"
      );
    } else {
      setDark(false);

      document.documentElement.classList.remove(
        "dark"
      );
    }

    setThemeReady(true);

    loadUser();

    /*
     * SHOP CŨ DÙNG SUPABASE AUTH
     *
     * WEBSITE RIÊNG KHÔNG DÙNG
     * SUPABASE AUTH NÀY.
     */

    let subscription = null;

    if (!isSiteMenu) {
      const {
        data: { subscription: authSubscription },
      } =
        supabase.auth.onAuthStateChange(
          async (
            _event,
            currentUser
          ) => {
            setUser(
              currentUser || null
            );

            if (currentUser) {
              await loadWallet(
                currentUser
              );
            } else {
              setBalance(0);
            }
          }
        );

      subscription =
        authSubscription;
    }

    const handleWalletUpdated = () => {
      loadUser();
    };

    const handleOpenMenu = () => {
      setOpen(true);
    };

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadUser();
      }
    };

    window.addEventListener(
      "xenova-wallet-updated",
      handleWalletUpdated
    );

    window.addEventListener(
      "xenova-open-menu",
      handleOpenMenu
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      subscription?.unsubscribe();

      window.removeEventListener(
        "xenova-wallet-updated",
        handleWalletUpdated
      );

      window.removeEventListener(
        "xenova-open-menu",
        handleOpenMenu
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [
    pathname,
    siteSlug,
    isSiteMenu,
  ]);

  /*
   * ==========================================
   * ĐỔI THEME
   * ==========================================
   */

  function toggleTheme() {
    const nextDark = !dark;

    setDark(nextDark);

    if (nextDark) {
      document.documentElement.classList.add(
        "dark"
      );

      localStorage.setItem(
        "xenova-theme",
        "dark"
      );
    } else {
      document.documentElement.classList.remove(
        "dark"
      );

      localStorage.setItem(
        "xenova-theme",
        "light"
      );
    }
  }

  /*
   * ==========================================
   * ĐĂNG XUẤT
   * ==========================================
   */

  async function logout() {
    /*
     * WEBSITE RIÊNG
     */

    if (isSiteMenu && siteSlug) {
      try {
        await fetch(
          `/api/sites/${siteSlug}/auth/logout`,
          {
            method: "POST",
          }
        );
      } catch (error) {
        console.error(
          "SITE LOGOUT ERROR:",
          error
        );
      }

      setOpen(false);
      setUser(null);
      setBalance(0);

      router.push(
        sitePath("/login")
      );

      router.refresh();

      return;
    }

    /*
     * SHOP CŨ
     */

    await supabase.auth.signOut();

    setOpen(false);
    setUser(null);
    setBalance(0);

    router.push("/login");
  }

  function closeMenu() {
    setOpen(false);
  }

  if (!themeReady) {
    return null;
  }

  /*
   * ==========================================
   * LINK MENU
   * ==========================================
   */

  const homeHref = isSiteMenu
    ? sitePath("")
    : "/";

  /*
   * QUAN TRỌNG:
   *
   * WEBSITE RIÊNG KHÔNG CÓ:
   * /sites/slug/shop
   *
   * Shop chính là:
   * /sites/slug
   */

  const shopHref = isSiteMenu
    ? sitePath("")
    : "/shop";

  const depositHref = isSiteMenu
    ? sitePath("/deposit")
    : "/deposit";

  const keysHref = isSiteMenu
    ? sitePath("/keys")
    : "/keys";

  const ordersHref = isSiteMenu
    ? sitePath("/orders")
    : "/orders";

  const accountHref = isSiteMenu
    ? sitePath(
        user
          ? "/account"
          : "/login"
      )
    : user
      ? "/dashboard"
      : "/login";

  const settingsHref = isSiteMenu
    ? sitePath("/settings")
    : "/settings";

  return (
    <>
      <div className="global-menu-buttons">
        <button
          type="button"
          className="global-theme-button"
          onClick={toggleTheme}
          aria-label="Đổi giao diện"
        >
          {dark ? "☀️" : "🌙"}
        </button>

        <button
          type="button"
          className="global-menu-button"
          onClick={() =>
            setOpen(true)
          }
          aria-label="Mở menu"
        >
          ☰
        </button>
      </div>

      {open && (
        <div
          className="xenova-menu-overlay"
          onClick={closeMenu}
        >
          <aside
            className="xenova-menu-drawer"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="xenova-menu-header">
              <div>
                <div className="xenova-menu-brand">
                  XENOVA{" "}
                  <span>PLAY</span>
                </div>

                <div className="xenova-menu-user">
                  {user
                    ? user.email ||
                      user.username ||
                      "Tài khoản"
                    : "Bạn chưa đăng nhập"}
                </div>
              </div>

              <button
                type="button"
                className="xenova-menu-close"
                onClick={closeMenu}
              >
                ✕
              </button>
            </div>

            <div className="xenova-menu-list">
              <MenuLink
                href={homeHref}
                icon="🏠"
                onClick={closeMenu}
              >
                Trang chủ
              </MenuLink>

              <MenuLink
                href={shopHref}
                icon="🛍️"
                onClick={closeMenu}
              >
                Cửa hàng
              </MenuLink>

              <MenuLink
                href={depositHref}
                icon="💰"
                onClick={closeMenu}
              >
                Nạp tiền
              </MenuLink>

              <MenuLink
                href={keysHref}
                icon="🔑"
                onClick={closeMenu}
              >
                KEY của tôi
              </MenuLink>

              <MenuLink
                href={ordersHref}
                icon="📦"
                onClick={closeMenu}
              >
                Đơn hàng
              </MenuLink>

              <MenuLink
                href={accountHref}
                icon="👤"
                onClick={closeMenu}
              >
                Tài khoản
              </MenuLink>

              <MenuLink
                href={settingsHref}
                icon="⚙️"
                onClick={closeMenu}
              >
                Cài đặt
              </MenuLink>
            </div>

            <div className="xenova-menu-bottom">
              <button
                type="button"
                className="xenova-menu-theme-row"
                onClick={toggleTheme}
              >
                <span>
                  {dark
                    ? "☀️"
                    : "🌙"}{" "}
                  Giao diện
                </span>

                <span>
                  {dark
                    ? "Tối"
                    : "Sáng"}
                </span>
              </button>

              {user ? (
                <button
                  type="button"
                  className="xenova-menu-logout"
                  onClick={logout}
                >
                  🚪 Đăng xuất
                </button>
              ) : (
                <Link
                  href={
                    isSiteMenu
                      ? sitePath(
                          "/login"
                        )
                      : "/login"
                  }
                  className="xenova-menu-login"
                  onClick={closeMenu}
                >
                  🔐 Đăng nhập
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className="xenova-bottom-toolbar">
        <Link
          href={depositHref}
          className="xenova-bottom-item"
          aria-label="Số dư"
        >
          <span className="xenova-bottom-icon">
            💰
          </span>

          <span className="xenova-bottom-text">
            <small>SỐ DƯ</small>

            <strong>
              {formatPrice(balance)}
            </strong>
          </span>
        </Link>

        <Link
          href={accountHref}
          className="xenova-bottom-item xenova-account-bottom"
          aria-label="Tài khoản"
        >
          <span className="xenova-avatar">
            🐰
          </span>
        </Link>

        <Link
          href={keysHref}
          className="xenova-bottom-item xenova-key-bottom"
          aria-label="KEY"
        >
          <span className="xenova-bottom-icon">
            🔑
          </span>
        </Link>
      </div>
    </>
  );
}
