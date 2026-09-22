"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

export default function SiteAuthPage({
  website,
  mode = "login",
}) {
  const router =
    useRouter();

  const [isLogin, setIsLogin] =
    useState(
      mode === "login"
    );

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function submit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (
        !isLogin &&
        password !==
          confirmPassword
      ) {
        throw new Error(
          "Mật khẩu nhập lại không khớp."
        );
      }

      const endpoint =
        isLogin
          ? `/api/sites/${website.slug}/auth/login`
          : `/api/sites/${website.slug}/auth/register`;

      const body = isLogin
        ? {
            email,
            password,
          }
        : {
            username,
            email,
            password,
          };

      const response =
        await fetch(
          endpoint,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              body
            ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Thao tác thất bại."
        );
      }

      if (isLogin) {
        setMessage(
          "Đăng nhập thành công."
        );

        router.push(
          `/sites/${website.slug}`
        );

        router.refresh();

        return;
      }

      setMessage(
        "Đăng ký thành công. Đang chuyển sang đăng nhập..."
      );

      setTimeout(() => {
        router.push(
          `/sites/${website.slug}/login`
        );
      }, 700);
    } catch (err) {
      setError(
        err?.message ||
          "Có lỗi xảy ra."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="site-auth-page">

      <div className="site-auth-card">

        {website.logo_url ? (
          <img
            src={website.logo_url}
            alt={website.name}
            className="site-auth-logo"
          />
        ) : (
          <div className="site-auth-logo-placeholder">
            {(
              website.name ||
              "S"
            )
              .charAt(0)
              .toUpperCase()}
          </div>
        )}

        <h1>
          {isLogin
            ? "Đăng nhập"
            : "Tạo tài khoản"}
        </h1>

        <p>
          {website.name}
        </p>

        <form
          onSubmit={submit}
        >

          {!isLogin && (
            <input
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value
                )
              }
              placeholder="Tên tài khoản"
              required
              autoComplete="username"
            />
          )}

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="Email"
            required
            autoComplete="email"
          />

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            placeholder="Mật khẩu"
            required
            autoComplete={
              isLogin
                ? "current-password"
                : "new-password"
            }
          />

          {!isLogin && (
            <input
              type="password"
              value={
                confirmPassword
              }
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              placeholder="Nhập lại mật khẩu"
              required
              autoComplete="new-password"
            />
          )}

          {error && (
            <div className="site-auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="site-auth-success">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Đang xử lý..."
              : isLogin
              ? "ĐĂNG NHẬP"
              : "ĐĂNG KÝ"}
          </button>

        </form>

        <button
          type="button"
          className="site-auth-switch"
          onClick={() => {
            setError("");
            setMessage("");
            setIsLogin(
              !isLogin
            );
          }}
        >
          {isLogin
            ? "Chưa có tài khoản? Đăng ký"
            : "Đã có tài khoản? Đăng nhập"}
        </button>

        <button
          type="button"
          className="site-auth-home"
          onClick={() =>
            router.push(
              `/sites/${website.slug}`
            )
          }
        >
          ← Về cửa hàng
        </button>

      </div>

      <style jsx>{`
        .site-auth-page {
          min-height: 100vh;
          padding: 90px 16px 120px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f8f7fb;
        }

        .site-auth-card {
          width: 100%;
          max-width: 430px;
          padding: 30px;
          border-radius: 28px;
          background: white;
          box-shadow: 0 15px 50px rgba(0,0,0,.08);
          text-align: center;
        }

        .site-auth-logo {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 22px;
        }

        .site-auth-logo-placeholder {
          width: 80px;
          height: 80px;
          margin: auto;
          display: grid;
          place-items: center;
          border-radius: 22px;
          background: #ec2d91;
          color: white;
          font-size: 34px;
          font-weight: 900;
        }

        h1 {
          margin: 18px 0 5px;
          font-size: 28px;
        }

        p {
          margin: 0 0 22px;
          color: #888;
        }

        form {
          display: grid;
          gap: 12px;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 16px;
          border: 1px solid #eadfea;
          border-radius: 14px;
          outline: none;
          background: #fff;
        }

        input:focus {
          border-color: #ec2d91;
        }

        form button {
          border: 0;
          padding: 14px;
          border-radius: 14px;
          background: #ec2d91;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        form button:disabled {
          opacity: .6;
        }

        .site-auth-error,
        .site-auth-success {
          padding: 11px 13px;
          border-radius: 12px;
          font-size: 14px;
        }

        .site-auth-error {
          background: #fff0f0;
          color: #d33;
        }

        .site-auth-success {
          background: #effff5;
          color: #16834b;
        }

        .site-auth-switch,
        .site-auth-home {
          width: 100%;
          margin-top: 14px;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .site-auth-switch {
          color: #ec2d91;
          font-weight: 700;
        }

        .site-auth-home {
          color: #777;
        }
      `}</style>

    </main>
  );
}
