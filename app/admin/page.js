"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    availableKeys: 0,
    soldKeys: 0,
    orders: 0,
    revenue: 0,
  });

  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    try {
      const [
        usersResult,
        productsResult,
        availableKeysResult,
        soldKeysResult,
        ordersResult,
        paidOrdersResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("products")
          .select("*")
          .order("id", { ascending: true }),

        supabase
          .from("keys")
          .select("id", { count: "exact", head: true })
          .eq("status", "available"),

        supabase
          .from("keys")
          .select("id", { count: "exact", head: true })
          .eq("status", "sold"),

        supabase
          .from("orders")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("orders")
          .select("amount")
          .eq("status", "paid"),
      ]);

      const revenue = (paidOrdersResult.data || []).reduce(
        (total, order) => total + Number(order.amount || 0),
        0
      );

      setStats({
        users: usersResult.count || 0,
        products: productsResult.data?.length || 0,
        availableKeys: availableKeysResult.count || 0,
        soldKeys: soldKeysResult.count || 0,
        orders: ordersResult.count || 0,
        revenue,
      });

      setProducts(productsResult.data || []);
    } catch (error) {
      console.error("ADMIN DASHBOARD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <div style={styles.logo}>XENOVA PLAY</div>
            <h1 style={styles.title}>ADMIN DASHBOARD</h1>
            <p style={styles.subtitle}>
              Quản lý toàn bộ hệ thống XENOVA
            </p>
          </div>

          <button
            onClick={loadDashboard}
            style={styles.refreshButton}
          >
            ↻ Làm mới
          </button>
        </div>

        {/* MENU */}
        <div style={styles.menu}>
          <Link href="/admin" style={styles.menuActive}>
            Tổng quan
          </Link>

          <Link href="/admin/products" style={styles.menuItem}>
            Sản phẩm
          </Link>

          <Link href="/admin/keys" style={styles.menuItem}>
            Kho KEY
          </Link>

          <Link href="/admin/orders" style={styles.menuItem}>
            Đơn hàng
          </Link>

          <Link href="/admin/users" style={styles.menuItem}>
            Thành viên
          </Link>
        </div>

        {/* STATISTICS */}
        <section style={styles.grid}>

          <StatCard
            icon="👤"
            title="THÀNH VIÊN"
            value={loading ? "..." : stats.users}
          />

          <StatCard
            icon="📦"
            title="SẢN PHẨM"
            value={loading ? "..." : stats.products}
          />

          <StatCard
            icon="🔑"
            title="KEY TRONG KHO"
            value={loading ? "..." : stats.availableKeys}
          />

          <StatCard
            icon="🔐"
            title="KEY ĐÃ BÁN"
            value={loading ? "..." : stats.soldKeys}
          />

          <StatCard
            icon="🧾"
            title="TỔNG ĐƠN HÀNG"
            value={loading ? "..." : stats.orders}
          />

          <StatCard
            icon="💰"
            title="DOANH THU"
            value={loading ? "..." : formatMoney(stats.revenue)}
          />

        </section>

        {/* QUICK ACTION */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>QUẢN LÝ NHANH</h2>

          <div style={styles.quickGrid}>

            <Link href="/admin/products" style={styles.quickCard}>
              <span style={styles.quickIcon}>📦</span>
              <div>
                <strong>Quản lý sản phẩm</strong>
                <p>Thêm, sửa, xóa và chỉnh giá sản phẩm</p>
              </div>
            </Link>

            <Link href="/admin/keys" style={styles.quickCard}>
              <span style={styles.quickIcon}>🔑</span>
              <div>
                <strong>Quản lý KEY</strong>
                <p>Nhập KEY và quản lý kho từng sản phẩm</p>
              </div>
            </Link>

            <Link href="/admin/orders" style={styles.quickCard}>
              <span style={styles.quickIcon}>🧾</span>
              <div>
                <strong>Quản lý đơn hàng</strong>
                <p>Xem đơn và cấp KEY cho khách</p>
              </div>
            </Link>

            <Link href="/admin/users" style={styles.quickCard}>
              <span style={styles.quickIcon}>👤</span>
              <div>
                <strong>Quản lý thành viên</strong>
                <p>Xem tài khoản và KEY của thành viên</p>
              </div>
            </Link>

          </div>
        </section>

        {/* PRODUCTS */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>SẢN PHẨM</h2>

            <Link href="/admin/products" style={styles.viewAll}>
              Quản lý →
            </Link>
          </div>

          {loading ? (
            <div style={styles.empty}>
              Đang tải dữ liệu...
            </div>
          ) : products.length === 0 ? (
            <div style={styles.empty}>
              Chưa có sản phẩm
            </div>
          ) : (
            <div style={styles.productList}>
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>

      <div>
        <div style={styles.statTitle}>{title}</div>
        <div style={styles.statValue}>{value}</div>
      </div>
    </div>
  );
}

function ProductRow({ product }) {
  const [stock, setStock] = useState("...");

  useEffect(() => {
    loadStock();
  }, []);

  async function loadStock() {
    const { count } = await supabase
      .from("keys")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("product_id", product.id)
      .eq("status", "available");

    setStock(count || 0);
  }

  const active =
    product.active !== false &&
    product.is_active !== false;

  return (
    <div style={styles.productRow}>

      <div style={styles.productInfo}>
        <div style={styles.productName}>
          {product.name}
        </div>

        <div style={styles.productDescription}>
          {product.description || "Không có mô tả"}
        </div>
      </div>

      <div style={styles.productPrice}>
        {Number(product.price || 0).toLocaleString("vi-VN")}đ
      </div>

      <div style={styles.productDuration}>
        {product.duration_days || 0} ngày
      </div>

      <div
        style={{
          ...styles.status,
          color: active ? "#00e676" : "#ff5252",
          borderColor: active ? "#00e67655" : "#ff525255",
        }}
      >
        {active ? "ĐANG BÁN" : "TẮT"}
      </div>

      <div style={styles.stock}>
        Kho: <b>{stock}</b>
      </div>

    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #151515 0%, #050505 45%, #000 100%)",
    color: "#fff",
    padding: "30px 15px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "25px",
  },

  logo: {
    fontSize: "14px",
    fontWeight: "800",
    letterSpacing: "4px",
    color: "#ff1744",
    marginBottom: "7px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#888",
    fontSize: "14px",
  },

  refreshButton: {
    background: "#151515",
    color: "#fff",
    border: "1px solid #292929",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: "700",
  },

  menu: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "25px",
  },

  menuItem: {
    textDecoration: "none",
    color: "#aaa",
    background: "#101010",
    border: "1px solid #222",
    padding: "11px 15px",
    borderRadius: "9px",
    fontSize: "14px",
    fontWeight: "700",
  },

  menuActive: {
    textDecoration: "none",
    color: "#fff",
    background: "#e50932",
    border: "1px solid #e50932",
    padding: "11px 15px",
    borderRadius: "9px",
    fontSize: "14px",
    fontWeight: "800",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "12px",
  },

  statCard: {
    background:
      "linear-gradient(145deg, #151515, #0c0c0c)",
    border: "1px solid #252525",
    borderRadius: "14px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  statIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#1d1d1d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
  },

  statTitle: {
    fontSize: "11px",
    color: "#777",
    fontWeight: "800",
    letterSpacing: ".7px",
  },

  statValue: {
    fontSize: "23px",
    fontWeight: "900",
    marginTop: "5px",
  },

  section: {
    marginTop: "25px",
    background: "#0b0b0b",
    border: "1px solid #202020",
    borderRadius: "15px",
    padding: "18px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "900",
  },

  viewAll: {
    color: "#ff1744",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "800",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "10px",
  },

  quickCard: {
    textDecoration: "none",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    padding: "15px",
    background: "#111",
    border: "1px solid #222",
    borderRadius: "12px",
  },

  quickIcon: {
    fontSize: "25px",
  },

  productList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  productRow: {
    display: "grid",
    gridTemplateColumns:
      "minmax(180px, 1fr) 120px 90px 100px 90px",
    gap: "12px",
    alignItems: "center",
    padding: "14px",
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: "10px",
  },

  productInfo: {
    minWidth: 0,
  },

  productName: {
    fontWeight: "800",
    fontSize: "14px",
  },

  productDescription: {
    marginTop: "4px",
    color: "#666",
    fontSize: "12px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  productPrice: {
    color: "#00e676",
    fontWeight: "900",
  },

  productDuration: {
    color: "#aaa",
    fontSize: "13px",
  },

  status: {
    width: "fit-content",
    border: "1px solid",
    borderRadius: "20px",
    padding: "5px 9px",
    fontSize: "10px",
    fontWeight: "900",
  },

  stock: {
    color: "#aaa",
    fontSize: "12px",
  },

  empty: {
    textAlign: "center",
    color: "#666",
    padding: "30px",
  },
};
