"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ActivateKeyPage() {
  const [keyCode, setKeyCode] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function activateKey(e) {
    e.preventDefault();

    const code = keyCode.trim();

    if (!code) {
      setSuccess(false);
      setMessage("Vui lòng nhập KEY.");
      return;
    }

    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data, error } = await supabase.rpc(
      "activate_key",
      {
        input_key: code,
      }
    );

    if (error) {
      setSuccess(false);
      setMessage(
        "Có lỗi xảy ra: " + error.message
      );
      setLoading(false);
      return;
    }

    if (!data?.success) {
      setSuccess(false);
      setMessage(
        data?.message || "Không thể kích hoạt KEY."
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setMessage(
      data.message || "Kích hoạt KEY thành công!"
    );

    setKeyCode("");
    setLoading(false);
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <a
          href="/dashboard"
          style={styles.back}
        >
          ← Dashboard
        </a>

        <div style={styles.card}>

          <div style={styles.icon}>
            🔑
          </div>

          <h1 style={styles.title}>
            KÍCH HOẠT KEY
          </h1>

          <p style={styles.description}>
            Nhập KEY của bạn để kích hoạt sản phẩm.
          </p>

          <form onSubmit={activateKey}>

            <input
              value={keyCode}
              onChange={(e) =>
                setKeyCode(e.target.value)
              }
              placeholder="XENO-XXXX-XXXX-XXXX"
              autoComplete="off"
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
                ? "ĐANG KIỂM TRA..."
                : "KÍCH HOẠT KEY"}
            </button>

          </form>

          {message && (
            <div
              style={{
                ...styles.message,
                ...(success
                  ? styles.success
                  : styles.error),
              }}
            >
              {success ? "✅ " : "❌ "}
              {message}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#050505",
    color: "#fff",
    padding: "30px 15px",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    maxWidth: "600px",
    margin: "0 auto",
  },

  back: {
    color: "#aaa",
    textDecoration: "none",
    fontSize: "15px",
  },

  card: {
    marginTop: "35px",
    padding: "30px 22px",
    background: "#101010",
    border: "1px solid #292929",
    borderRadius: "20px",
    textAlign: "center",
  },

  icon: {
    fontSize: "60px",
    marginBottom: "10px",
  },

  title: {
    margin: "0",
    fontSize: "32px",
    fontWeight: "900",
  },

  description: {
    color: "#888",
    marginTop: "12px",
    marginBottom: "25px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #333",
    background: "#181818",
    color: "#fff",
    fontSize: "16px",
    outline: "none",
  },

  button: {
    width: "100%",
    marginTop: "15px",
    padding: "16px",
    border: "none",
    borderRadius: "12px",
    background: "#ff1744",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "900",
  },

  message: {
    marginTop: "20px",
    padding: "15px",
    borderRadius: "12px",
    fontWeight: "700",
  },

  success: {
    background: "#092015",
    border: "1px solid #00a854",
    color: "#00e676",
  },

  error: {
    background: "#210b0b",
    border: "1px solid #7a1717",
    color: "#ff5252",
  },
};
