"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function WebsiteAdminPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params?.slug;

  const [loading, setLoading] = useState(true);
  const [website, setWebsite] = useState(null);
  const [admin, setAdmin] = useState(null);

  const [stats, setStats] = useState({
    categories: 0,
    products: 0,
    orders: 0,
  });

  useEffect(() => {
    if (slug) {
      loadAdmin();
    }
  }, [slug]);

  async function loadAdmin() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace(`/sites/${slug}/admin/login`);
        return;
      }

      /*
       * Lấy đúng website theo slug.
       */
      const { data: site, error: siteError } =
        await supabase
          .from("websites")
          .select("*")
          .eq("slug", slug)
          .eq("status", "active")
          .maybeSingle();

      if (siteError) {
        console.error(
          "WEBSITE LOAD ERROR:",
          siteError
        );

        router.replace(
          `/sites/${slug}/admin/login`
        );

        return;
      }

      if (!site) {
        router.replace(`/sites/${slug}`);
        return;
      }

      /*
       * Kiểm tra quyền Admin của đúng website.
       *
       * Bắt buộc:
       * website_admins.website_id = site.id
       * website_admins.user_id = session.user.id
       * website_admins.active = true
       */
      const {
        data: adminData,
        error: adminError,
      } = await supabase
        .from("website_admins")
        .select(
          "id, website_id, user_id, email, role, active"
        )
        .eq("website_id", site.id)
        .eq("user_id", session.user.id)
        .eq("active", true)
        .maybeSingle();

      if (adminError) {
        console.error(
          "WEBSITE ADMIN CHECK ERROR:",
          adminError
        );

        await supabase.auth.signOut();

        router.replace(
          `/sites/${slug}/admin/login`
        );

        return;
      }

      /*
       * Không có quyền Admin website này.
       */
      if (!adminData) {
        await supabase.auth.signOut();

        router.replace(
          `/sites/${slug}/admin/login`
        );

        return;
      }

      /*
       * Kiểm tra lại website_id lần cuối.
       */
      if (adminData.website_id !== site.id) {
        await supabase.auth.signOut();

        router.replace(
          `/sites/${slug}/admin/login`
        );

        return;
      }

      setWebsite(site);
      setAdmin(adminData);

      /*
       * Thống kê riêng website hiện tại.
       */
      const [
        categoriesResult,
        productsResult,
        ordersResult,
      ] = await Promise.all([
        supabase
          .from("website_categories")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("website_id", site.id),

        supabase
          .from("website_products")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("website_id", site.id),

        supabase
          .from("website_orders")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("website_id", site.id),
      ]);

      setStats({
        categories:
          categoriesResult.count || 0,

        products:
          productsResult.count || 0,

        orders:
          ordersResult.count || 0,
      });
    } catch (error) {
      console.error(
        "WEBSITE ADMIN ERROR:",
        error
      );

      await supabase.auth.signOut();

      router.replace(
        `/sites/${slug}/admin/login`
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace(
        `/sites/${slug}/admin/login`
      );
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Đang tải Admin...
        </div>
      </main>
    );
  }

  /*
   * Không có website hoặc admin
   * thì không render nội dung quản trị.
   */
  if (!website || !admin) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Đang kiểm tra quyền...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.brand}>
            {website?.logo_url ? (
              <img
                src={website.logo_url}
                alt=""
                style={styles.logo}
              />
            ) : (
              <div style={styles.logoFallback}>
                {website?.name
                  ?.charAt(0)
                  ?.toUpperCase() || "A"}
              </div>
            )}

            <div>
              <div style={styles.adminLabel}>
                ADMIN
              </div>

              <h1 style={styles.title}>
                {website?.name}
              </h1>

              <div style={styles.slug}>
                /{website?.slug}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            style={styles.logout}
          >
            Đăng xuất
          </button>
        </header>

        <div style={styles.grid}>
          <Stat
            icon="📦"
            label="Sản phẩm"
            value={stats.products}
          />

          <Stat
            icon="🏷️"
            label="Danh mục"
            value={stats.categories}
          />

          <Stat
            icon="📋"
            label="Đơn hàng"
            value={stats.orders}
          />
        </div>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            Quản lý Shop
          </h2>

          <div style={styles.menuGrid}>
            <Menu
              href={`/sites/${slug}/admin/products`}
              icon="🛒"
              title="Sản phẩm"
              text="Quản lý sản phẩm và giá"
            />

            <Menu
              href={`/sites/${slug}/admin/categories`}
              icon="🏷️"
              title="Danh mục"
              text="Quản lý danh mục sản phẩm"
            />

            <Menu
              href={`/sites/${slug}/admin/orders`}
              icon="📋"
              title="Đơn hàng"
              text="Quản lý đơn hàng"
            />

            <Menu
              href={`/sites/${slug}/admin/deposits`}
              icon="💰"
              title="Nạp tiền"
              text="Duyệt yêu cầu nạp tiền"
            />

            <Menu
              href={`/sites/${slug}/admin/settings`}
              icon="⚙️"
              title="Cài đặt"
              text="Logo, banner, thanh toán..."
            />
          </div>
        </section>

        <div style={styles.adminInfo}>
          <div style={styles.adminInfoLabel}>
            TÀI KHOẢN QUẢN TRỊ
          </div>

          <div style={styles.adminInfoValue}>
            {admin.email ||
              "Tài khoản Admin"}
          </div>

          <div style={styles.adminRole}>
            Quyền: {admin.role || "admin"}
          </div>
        </div>

        <Link
          href={`/sites/${slug}`}
          style={styles.shopButton}
        >
          ← Xem Shop
        </Link>
      </div>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}) {
  return (
    <div style={styles.stat}>
      <div style={styles.statIcon}>
        {icon}
      </div>

      <div>
        <div style={styles.statValue}>
          {value}
        </div>

        <div style={styles.statLabel}>
          {label}
        </div>
      </div>
    </div>
  );
}

function Menu({
  href,
  icon,
  title,
  text,
}) {
  return (
    <Link
      href={href}
      style={styles.menu}
    >
      <div style={styles.menuIcon}>
        {icon}
      </div>

      <div>
        <div style={styles.menuTitle}>
          {title}
        </div>

        <div style={styles.menuText}>
          {text}
        </div>
      </div>

      <div style={styles.arrow}>
        →
      </div>
    </Link>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg,#08070c,#0d0b12)",
    color: "#fff",
    padding: "25px 15px 60px",
  },

  container: {
    width: "100%",
    maxWidth: "1000px",
    margin: "0 auto",
  },

  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    color: "#aaa",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "25px",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  logo: {
    width: "54px",
    height: "54px",
    objectFit: "cover",
    borderRadius: "14px",
  },

  logoFallback: {
    width: "54px",
    height: "54px",
    borderRadius: "14px",
    display: "grid",
    placeItems: "center",
    background: "#ff4eae",
    fontWeight: "950",
    fontSize: "22px",
  },

  adminLabel: {
    color: "#ff5eb7",
    fontSize: "9px",
    fontWeight: "950",
    letterSpacing: "2px",
  },

  title: {
    margin: "3px 0 0",
    fontSize: "23px",
    fontWeight: "950",
  },

  slug: {
    color: "#696371",
    fontSize: "10px",
    marginTop: "3px",
  },

  logout: {
    border: "1px solid #352d3b",
    background: "#141119",
    color: "#aaa",
    padding: "10px 14px",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "800",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: "12px",
    marginBottom: "20px",
  },

  stat: {
    padding: "18px",
    borderRadius: "14px",
    border: "1px solid #29232f",
    background: "#111016",
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  statIcon: {
    fontSize: "23px",
  },

  statValue: {
    fontSize: "23px",
    fontWeight: "950",
  },

  statLabel: {
    color: "#77717f",
    fontSize: "11px",
    marginTop: "2px",
  },

  card: {
    padding: "20px",
    borderRadius: "16px",
    border: "1px solid #29232f",
    background: "#111016",
  },

  sectionTitle: {
    margin: "0 0 16px",
    fontSize: "16px",
    fontWeight: "900",
  },

  menuGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "12px",
  },

  menu: {
    minHeight: "80px",
    padding: "15px",
    boxSizing: "border-box",
    borderRadius: "12px",
    border: "1px solid #29232f",
    background: "#0b0a0f",
    textDecoration: "none",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  menuIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "11px",
    display: "grid",
    placeItems: "center",
    background: "#211522",
    fontSize: "19px",
    flexShrink: 0,
  },

  menuTitle: {
    fontSize: "13px",
    fontWeight: "900",
  },

  menuText: {
    marginTop: "4px",
    color: "#716b79",
    fontSize: "10px",
  },

  arrow: {
    marginLeft: "auto",
    color: "#ff5eb7",
    fontWeight: "900",
  },

  adminInfo: {
    marginTop: "15px",
    padding: "15px 17px",
    borderRadius: "12px",
    border: "1px solid #29232f",
    background: "#0d0c11",
  },

  adminInfoLabel: {
    color: "#625c69",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1.5px",
  },

  adminInfoValue: {
    marginTop: "6px",
    fontSize: "12px",
    fontWeight: "800",
    color: "#ddd",
  },

  adminRole: {
    marginTop: "3px",
    color: "#77717f",
    fontSize: "10px",
  },

  shopButton: {
    display: "block",
    width: "fit-content",
    margin: "20px auto 0",
    padding: "11px 18px",
    borderRadius: "10px",
    border: "1px solid #352d3b",
    color: "#aaa",
    textDecoration: "none",
    fontSize: "11px",
    fontWeight: "800",
  },
};
