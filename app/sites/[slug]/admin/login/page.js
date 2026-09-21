"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function WebsiteAdminLoginPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params?.slug;

  const [website, setWebsite] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;

    loadWebsite();
  }, [slug]);

  async function loadWebsite() {
    try {
      setChecking(true);
      setError("");

      const { data, error } = await supabase
        .from("websites")
        .select(
          "id,name,slug,logo_url,status"
        )
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setError("Website không tồn tại hoặc đã bị khóa.");
        return;
      }

      setWebsite(data);

      // Kiểm tra nếu đã đăng nhập
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const allowed =
          await checkWebsiteAdmin(
            data.id,
            session.user.id
          );

        if (allowed) {
          router.replace(
            `/sites/${slug}/admin`
          );
        }
      }
    } catch (err) {
      console.error(err);
      setError(
        "Không thể tải thông tin website."
      );
    } finally {
      setChecking(false);
    }
  }

  async function checkWebsiteAdmin(
    websiteId,
    userId
  ) {
    const { data, error } = await supabase
      .from("website_admins")
      .select("id,role,active")
      .eq("website_id", websiteId)
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      console.error(
        "ADMIN CHECK ERROR:",
        error
      );
      return false;
    }

    return !!data;
  }

  async function handleLogin(event) {
    event.preventDefault();

    if (loading) return;

    setError("");

    if (!email.trim() || !password) {
      setError(
        "Vui lòng nhập email và mật khẩu."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        setError(
          loginError.message ||
            "Email hoặc mật khẩu không đúng."
        );
        return;
      }

      if (!data?.user) {
        setError(
          "Không thể đăng nhập."
        );
        return;
      }

      const allowed =
        await checkWebsiteAdmin(
          website.id,
          data.user.id
        );

      if (!allowed) {
        await supabase.auth.signOut();

        setError(
          "Tài khoản này không có quyền quản trị website này."
        );

        return;
      }

      router.replace(
        `/sites/${slug}/admin`
      );

      router.refresh();
    } catch (err) {
      console.error(err);

      setError(
        "Có lỗi xảy ra khi đăng nhập."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <div style={styles.loading}>
            Đang tải...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.card}>
        {website?.logo_url ? (
          <img
            src={website.logo_url}
            alt={website.name}
            style={styles.logoImage}
          />
        ) : (
          <div style={styles.logoText}>
            {website?.name || "SHOP"}
          </div>
        )}

        <div style={styles.badge}>
          ADMIN
        </div>

        <h1 style={styles.title}>
          {website?.name}
        </h1>

        <p style={styles.subtitle}>
          Đăng nhập trang quản trị riêng
        </p>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label style={styles.label}>
            EMAIL
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="Email Admin"
            autoComplete="email"
            disabled={loading}
            style={styles.input}
          />

          <label style={styles.label}>
            MẬT KHẨU
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Mật khẩu"
            autoComplete="current-password"
            disabled={loading}
            style={styles.input}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? "ĐANG ĐĂNG NHẬP..."
              : "ĐĂNG NHẬP ADMIN →"}
          </button>
        </form>

        <a
          href={`/sites/${slug}`}
          style={styles.back}
        >
          ← Quay lại Shop
        </a>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top, #20132a 0%, #09070d 50%, #040406 100%)",
    color: "#fff",
  },

  glowOne: {
    position: "fixed",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "rgba(255, 50, 160, .12)",
    filter: "blur(90px)",
    top: "-120px",
    left: "-100px",
  },

  glowTwo: {
    position: "fixed",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "rgba(120, 50, 255, .10)",
    filter: "blur(90px)",
    bottom: "-120px",
    right: "-100px",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    padding: "32px 25px",
    borderRadius: "22px",
    background: "rgba(13, 13, 20, .96)",
    border: "1px solid #2b2435",
    boxShadow:
      "0 30px 100px rgba(0,0,0,.55)",
    position: "relative",
    zIndex: 2,
  },

  logoImage: {
    display: "block",
    width: "80px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "18px",
    margin: "0 auto 14px",
  },

  logoText: {
    textAlign: "center",
    fontSize: "24px",
    fontWeight: "950",
    marginBottom: "14px",
  },

  badge: {
    width: "fit-content",
    margin: "0 auto 12px",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "#241322",
    border: "1px solid #6a2b55",
    color: "#ff75c5",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  title: {
    margin: 0,
    textAlign: "center",
    fontSize: "26px",
    fontWeight: "950",
  },

  subtitle: {
    margin: "8px 0 25px",
    textAlign: "center",
    color: "#858191",
    fontSize: "13px",
  },

  error: {
    padding: "11px 12px",
    marginBottom: "16px",
    borderRadius: "10px",
    background: "#29151c",
    border: "1px solid #5e2837",
    color: "#ff879f",
    fontSize: "12px",
  },

  label: {
    display: "block",
    margin: "15px 0 7px",
    color: "#8c8796",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  input: {
    width: "100%",
    height: "48px",
    boxSizing: "border-box",
    padding: "0 14px",
    borderRadius: "10px",
    border: "1px solid #302b39",
    outline: "none",
    background: "#08080c",
    color: "#fff",
    fontSize: "14px",
  },

  button: {
    width: "100%",
    height: "50px",
    marginTop: "23px",
    border: "none",
    borderRadius: "11px",
    background:
      "linear-gradient(135deg,#ff4eae,#b63cff)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "950",
    cursor: "pointer",
  },

  back: {
    display: "block",
    marginTop: "22px",
    textAlign: "center",
    color: "#777181",
    fontSize: "12px",
    textDecoration: "none",
  },

  loading: {
    textAlign: "center",
    color: "#aaa",
    padding: "30px",
  },
};
