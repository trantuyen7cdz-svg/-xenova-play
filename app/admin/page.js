"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./admin.module.css";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || profile?.role !== "admin") {
        setAllowed(false);
        setLoading(false);
        return;
      }

      setUser(user);
      setAllowed(true);
      setLoading(false);
    }

    checkAdmin();
  }, []);

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingCard}>
          Đang kiểm tra quyền Admin...
        </div>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className={styles.deniedPage}>
        <div className={styles.deniedCard}>
          <h1>🚫 Không có quyền</h1>
          <p>Tài khoản này không phải Admin.</p>
          <a href="/dashboard">← Quay lại Dashboard</a>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.adminPage}>
      <div className={styles.adminContainer}>

        <header className={styles.adminHeader}>
          <div>
            <div className={styles.logo}>XENOVA PLAY</div>

            <h1 className={styles.title}>
              ADMIN PANEL
            </h1>

            <p className={styles.email}>
              {user?.email}
            </p>
          </div>

          <a
            href="/dashboard"
            className={styles.backButton}
          >
            ← Dashboard
          </a>
        </header>

        <div className={styles.menuGrid}>

          <a
            href="#products"
            className={styles.menuCard}
          >
            <span className={styles.menuIcon}>📦</span>
            <span className={styles.menuTitle}>Sản phẩm</span>
            <span className={styles.menuDescription}>
              Quản lý các gói KEY
            </span>
          </a>

          <a
            href="#keys"
            className={styles.menuCard}
          >
            <span className={styles.menuIcon}>🔑</span>
            <span className={styles.menuTitle}>KEY</span>
            <span className={styles.menuDescription}>
              Tạo và quản lý KEY
            </span>
          </a>

          <a
            href="#users"
            className={styles.menuCard}
          >
            <span className={styles.menuIcon}>👤</span>
            <span className={styles.menuTitle}>Người dùng</span>
            <span className={styles.menuDescription}>
              Quản lý tài khoản
            </span>
          </a>

          <a
            href="#orders"
            className={styles.menuCard}
          >
            <span className={styles.menuIcon}>🧾</span>
            <span className={styles.menuTitle}>Đơn hàng</span>
            <span className={styles.menuDescription}>
              Quản lý giao dịch
            </span>
          </a>

        </div>

        <section
          id="products"
          className={styles.section}
        >
          <h2 className={styles.sectionTitle}>
            📦 Sản phẩm
          </h2>

          <p className={styles.sectionText}>
            Quản lý các sản phẩm và gói KEY của XENOVA PLAY.
          </p>

          <span className={styles.badge}>
            SẮP RA MẮT
          </span>
        </section>

        <section
          id="keys"
          className={styles.section}
        >
          <h2 className={styles.sectionTitle}>
            🔑 Quản lý KEY
          </h2>

          <p className={styles.sectionText}>
            Tạo, kích hoạt, khóa và quản lý KEY.
          </p>

          <span className={styles.badge}>
            SẮP RA MẮT
          </span>
        </section>

        <section
          id="users"
          className={styles.section}
        >
          <h2 className={styles.sectionTitle}>
            👤 Người dùng
          </h2>

          <p className={styles.sectionText}>
            Xem và quản lý tài khoản người dùng.
          </p>

          <span className={styles.badge}>
            SẮP RA MẮT
          </span>
        </section>

        <section
          id="orders"
          className={styles.section}
        >
          <h2 className={styles.sectionTitle}>
            🧾 Đơn hàng
          </h2>

          <p className={styles.sectionText}>
            Theo dõi và quản lý các đơn hàng.
          </p>

          <span className={styles.badge}>
            SẮP RA MẮT
          </span>
        </section>

      </div>
    </main>
  );
}
