"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function WebsiteRegisterPage() {
  const params = useParams();
  const router = useRouter();

  const slug = String(params?.slug || "");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      !cleanUsername ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      setError(
        "Vui lòng nhập đầy đủ thông tin."
      );
      return;
    }

    if (cleanUsername.length < 3) {
      setError(
        "Tên tài khoản phải có ít nhất 3 ký tự."
      );
      return;
    }

    if (cleanUsername.length > 40) {
      setError(
        "Tên tài khoản không được quá 40 ký tự."
      );
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError(
        "Vui lòng nhập email hợp lệ."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Mật khẩu phải có ít nhất 6 ký tự."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Mật khẩu nhập lại không khớp."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/sites/${encodeURIComponent(
          slug
        )}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: cleanUsername,
            email: cleanEmail,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        setError(
          data?.message ||
            "Không thể đăng ký tài khoản."
        );
        return;
      }

      setSuccess(
        data?.message ||
          "Đăng ký tài khoản thành công."
      );

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push(
          `/sites/${slug}/login`
        );
      }, 1200);
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      setError(
        "Không thể kết nối máy chủ. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  function goLogin() {
    router.push(
      `/sites/${slug}/login`
    );
  }

  function goShop() {
    router.push(
      `/sites/${slug}`
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.backgroundCircleOne} />
      <div style={styles.backgroundCircleTwo} />

      <section style={styles.card}>
        <button
          type="button"
          onClick={goShop}
          style={styles.backButton}
        >
          ← Quay lại shop
        </button>

        <div style={styles.logo}>
          ✦
        </div>

        <h1 style={styles.title}>
          Tạo tài khoản
        </h1>

        <p style={styles.subtitle}>
          Đăng ký tài khoản để sử dụng shop
        </p>

        {error ? (
          <div style={styles.error}>
            {error}
          </div>
        ) : null}

        {success ? (
          <div style={styles.success}>
            {success}
          </div>
        ) : null}

        <form
          onSubmit={handleRegister}
          style={styles.form}
        >
          <div style={styles.field}>
            <label style={styles.label}>
              Tên tài khoản
            </label>

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value
                )
              }
              placeholder="Nhập tên tài khoản"
              autoComplete="username"
              disabled={loading}
              maxLength={40}
              style={styles.input}
            />

            <div style={styles.hint}>
              Từ 3 đến 40 ký tự
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="Nhập email của bạn"
              autoComplete="email"
              disabled={loading}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Mật khẩu
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Nhập mật khẩu"
              autoComplete="new-password"
              disabled={loading}
              style={styles.input}
            />

            <div style={styles.hint}>
              Mật khẩu tối thiểu 6 ký tự
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Nhập lại mật khẩu
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              disabled={loading}
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.registerButton,
              ...(loading
                ? styles.registerButtonDisabled
                : {}),
            }}
          >
            {loading
              ? "Đang đăng ký..."
              : "ĐĂNG KÝ TÀI KHOẢN"}
          </button>
        </form>

        <div style={styles.loginArea}>
          <span>
            Đã có tài khoản?
          </span>

          <button
            type="button"
            onClick={goLogin}
            disabled={loading}
            style={styles.loginLink}
          >
            Đăng nhập
          </button>
        </div>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #fff7fb 0%, #ffffff 48%, #fff0f7 100%)",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  backgroundCircleOne: {
    position: "fixed",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background:
      "rgba(255, 105, 170, 0.10)",
    top: "-180px",
    right: "-120px",
    pointerEvents: "none",
  },

  backgroundCircleTwo: {
    position: "fixed",
    width: "360px",
    height: "360px",
    borderRadius: "50%",
    background:
      "rgba(255, 182, 213, 0.14)",
    bottom: "-170px",
    left: "-120px",
    pointerEvents: "none",
  },

  card: {
    width: "100%",
    maxWidth: "430px",
    position: "relative",
    zIndex: 2,
    background: "#ffffff",
    borderRadius: "24px",
    padding: "32px",
    boxSizing: "border-box",
    boxShadow:
      "0 20px 60px rgba(255, 72, 145, 0.12)",
    border:
      "1px solid rgba(255, 105, 170, 0.16)",
  },

  backButton: {
    border: "none",
    background: "transparent",
    color: "#777",
    padding: 0,
    cursor: "pointer",
    fontSize: "14px",
    marginBottom: "22px",
  },

  logo: {
    width: "62px",
    height: "62px",
    margin: "0 auto 18px",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #ff4f9a, #ff82ba)",
    color: "#ffffff",
    fontSize: "30px",
    fontWeight: "700",
    boxShadow:
      "0 12px 25px rgba(255, 79, 154, 0.25)",
  },

  title: {
    margin: "0",
    textAlign: "center",
    color: "#222",
    fontSize: "28px",
    fontWeight: "800",
  },

  subtitle: {
    margin:
      "8px 0 26px",
    textAlign: "center",
    color: "#888",
    fontSize: "14px",
  },

  error: {
    background: "#fff1f3",
    border:
      "1px solid #ffc8d2",
    color: "#d93055",
    borderRadius: "12px",
    padding: "12px 14px",
    marginBottom: "18px",
    fontSize: "14px",
    lineHeight: "1.5",
  },

  success: {
    background: "#effcf4",
    border:
      "1px solid #b9e8c9",
    color: "#198754",
    borderRadius: "12px",
    padding: "12px 14px",
    marginBottom: "18px",
    fontSize: "14px",
    lineHeight: "1.5",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "17px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  label: {
    color: "#333",
    fontSize: "14px",
    fontWeight: "700",
  },

  input: {
    width: "100%",
    height: "50px",
    boxSizing: "border-box",
    border:
      "1px solid #e8dce2",
    borderRadius: "13px",
    padding:
      "0 15px",
    outline: "none",
    fontSize: "15px",
    color: "#222",
    background: "#ffffff",
  },

  hint: {
    color: "#999",
    fontSize: "12px",
    marginTop: "-2px",
  },

  registerButton: {
    width: "100%",
    height: "52px",
    border: "none",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg, #ff4f9a, #ff78b3)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer",
    marginTop: "3px",
    boxShadow:
      "0 10px 24px rgba(255, 79, 154, 0.22)",
  },

  registerButtonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  loginArea: {
    marginTop: "24px",
    paddingTop: "20px",
    borderTop:
      "1px solid #f1e7ec",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    flexWrap: "wrap",
    color: "#888",
    fontSize: "14px",
  },

  loginLink: {
    border: "none",
    background: "transparent",
    color: "#ff4f9a",
    fontWeight: "800",
    cursor: "pointer",
    padding: 0,
    fontSize: "14px",
  },
};
