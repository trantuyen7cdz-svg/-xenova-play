"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function KeysPage() {
  const [user, setUser] = useState(null);
  const [keys, setKeys] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        setError("Bạn cần đăng nhập để xem KEY.");
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Lấy KEY của chính tài khoản đang đăng nhập
      const { data: keyData, error: keyError } = await supabase
        .from("keys")
        .select(
          `
          id,
          key_code,
          product_id,
          user_id,
          expires_at,
          status,
          created_at,
          order_id,
          sold_at
        `
        )
        .eq("user_id", currentUser.id)
        .order("id", { ascending: false });

      if (keyError) {
        console.error("LOAD KEYS ERROR:", keyError);
        setError("Không thể tải danh sách KEY.");
        setLoading(false);
        return;
      }

      const userKeys = keyData || [];
      setKeys(userKeys);

      // Lấy thông tin sản phẩm riêng
      const productIds = [
        ...new Set(
          userKeys
            .map((item) => item.product_id)
            .filter((id) => id !== null && id !== undefined)
        ),
      ];

      if (productIds.length > 0) {
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("id,name,description,price,duration_days")
          .in("id", productIds);

        if (!productError && productData) {
          const productMap = {};

          for (const product of productData) {
            productMap[product.id] = product;
          }

          setProducts(productMap);
        }
      }
    } catch (err) {
      console.error("KEY PAGE ERROR:", err);
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function copyKey(keyCode, id) {
    try {
      await navigator.clipboard.writeText(keyCode);
      setCopiedId(id);

      setTimeout(() => {
        setCopiedId(null);
      }, 1800);
    } catch (error) {
      console.error("COPY KEY ERROR:", error);
    }
  }

  function formatDate(date) {
    if (!date) return "—";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "—";
    }

    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isExpired(date) {
    if (!date) return false;

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return false;
    }

    return d.getTime() < Date.now();
  }

  function getStatus(key) {
    if (key.status === "sold" && isExpired(key.expires_at)) {
      return {
        text: "Đã hết hạn",
        className: "expired",
      };
    }

    if (key.status === "sold") {
      return {
        text: "Đang hoạt động",
        className: "active",
      };
    }

    return {
      text: key.status || "Không xác định",
      className: "other",
    };
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loadingBox">
          <div className="spinner"></div>
          <p>Đang tải KEY...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page">
        <section className="emptyBox">
          <div className="bigIcon">🔐</div>

          <h1>KEY CỦA TÔI</h1>

          <p>
            Bạn cần đăng nhập để xem những KEY đã mua.
          </p>

          <Link href="/login" className="mainButton">
            ĐĂNG NHẬP
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <div className="top">
          <div>
            <div className="smallTitle">XENOVA PLAY</div>
            <h1>🔑 KEY CỦA TÔI</h1>
            <p className="subtitle">
              Danh sách KEY bạn đã mua
            </p>
          </div>

          <Link href="/shop" className="shopButton">
            🛒 Mua KEY
          </Link>
        </div>

        {error && (
          <div className="errorBox">
            {error}
          </div>
        )}

        {!error && keys.length === 0 && (
          <section className="emptyBox">
            <div className="bigIcon">🔑</div>

            <h2>Bạn chưa có KEY nào</h2>

            <p>
              Sau khi mua KEY thành công, KEY sẽ xuất hiện tại đây.
            </p>

            <Link href="/shop" className="mainButton">
              🛒 ĐẾN CỬA HÀNG
            </Link>
          </section>
        )}

        {keys.length > 0 && (
          <div className="keyList">
            {keys.map((key) => {
              const product = products[key.product_id];
              const status = getStatus(key);

              return (
                <section className="keyCard" key={key.id}>
                  <div className="cardHeader">
                    <div>
                      <div className="productName">
                        {product?.name || "Sản phẩm"}
                      </div>

                      <div className="orderText">
                        Đơn hàng #{key.order_id || "—"}
                      </div>
                    </div>

                    <span className={`status ${status.className}`}>
                      {status.text}
                    </span>
                  </div>

                  <div className="keyArea">
                    <div className="label">
                      KEY CỦA BẠN
                    </div>

                    <div className="keyRow">
                      <div className="keyCode">
                        {key.key_code}
                      </div>

                      <button
                        type="button"
                        className="copyButton"
                        onClick={() =>
                          copyKey(key.key_code, key.id)
                        }
                      >
                        {copiedId === key.id
                          ? "✓ Đã copy"
                          : "📋 Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="infoGrid">
                    <div className="infoItem">
                      <span>💰 Giá</span>
                      <strong>
                        {product?.price
                          ? Number(product.price).toLocaleString(
                              "vi-VN"
                            ) + "đ"
                          : "—"}
                      </strong>
                    </div>

                    <div className="infoItem">
                      <span>⏱ Thời hạn</span>
                      <strong>
                        {product?.duration_days
                          ? `${product.duration_days} ngày`
                          : "—"}
                      </strong>
                    </div>

                    <div className="infoItem">
                      <span>📅 Ngày mua</span>
                      <strong>
                        {formatDate(
                          key.sold_at || key.created_at
                        )}
                      </strong>
                    </div>

                    <div className="infoItem">
                      <span>⌛ Hết hạn</span>
                      <strong
                        className={
                          status.className === "expired"
                            ? "redText"
                            : ""
                        }
                      >
                        {formatDate(key.expires_at)}
                      </strong>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div className="bottomActions">
          <Link href="/dashboard">
            ← Về Dashboard
          </Link>

          <Link href="/orders">
            Xem đơn hàng →
          </Link>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 95px 18px 110px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(0, 153, 255, 0.13),
              transparent 38%
            ),
            #05070d;
          color: #fff;
        }

        .container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
        }

        .smallTitle {
          color: #39a9ff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 2px;
          margin-bottom: 7px;
        }

        h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 900;
          letter-spacing: -0.5px;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #8c96a8;
          font-size: 14px;
        }

        .shopButton {
          flex-shrink: 0;
          padding: 13px 18px;
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            #168cff,
            #075bd5
          );
          color: #fff;
          text-decoration: none;
          font-weight: 800;
          box-shadow: 0 8px 25px rgba(0, 120, 255, 0.25);
        }

        .errorBox {
          padding: 16px;
          border-radius: 14px;
          background: rgba(255, 55, 55, 0.09);
          border: 1px solid rgba(255, 70, 70, 0.25);
          color: #ff8b8b;
          margin-bottom: 20px;
        }

        .keyList {
          display: grid;
          gap: 18px;
        }

        .keyCard {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(
            145deg,
            rgba(18, 23, 35, 0.96),
            rgba(9, 12, 20, 0.96)
          );
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.25);
        }

        .cardHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 18px;
        }

        .productName {
          font-size: 19px;
          font-weight: 900;
        }

        .orderText {
          margin-top: 5px;
          color: #727c8e;
          font-size: 12px;
        }

        .status {
          flex-shrink: 0;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .status.active {
          background: rgba(0, 220, 130, 0.1);
          color: #39e89a;
          border: 1px solid rgba(0, 220, 130, 0.2);
        }

        .status.expired {
          background: rgba(255, 70, 70, 0.1);
          color: #ff7777;
          border: 1px solid rgba(255, 70, 70, 0.2);
        }

        .status.other {
          background: rgba(255, 255, 255, 0.06);
          color: #aeb7c6;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .keyArea {
          padding: 15px;
          border-radius: 15px;
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 17px;
        }

        .label {
          color: #6f7a8d;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.4px;
          margin-bottom: 9px;
        }

        .keyRow {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .keyCode {
          flex: 1;
          min-width: 0;
          overflow-x: auto;
          color: #fff;
          font-size: 15px;
          font-weight: 800;
          font-family: monospace;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .copyButton {
          flex-shrink: 0;
          border: 0;
          border-radius: 10px;
          padding: 10px 13px;
          background: rgba(22, 140, 255, 0.14);
          color: #55b3ff;
          cursor: pointer;
          font-weight: 800;
        }

        .copyButton:active {
          transform: scale(0.97);
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .infoItem {
          padding: 13px;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.035);
        }

        .infoItem span {
          display: block;
          color: #717b8c;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .infoItem strong {
          display: block;
          color: #e8edf5;
          font-size: 13px;
        }

        .redText {
          color: #ff6e6e !important;
        }

        .emptyBox,
        .loadingBox {
          max-width: 500px;
          margin: 80px auto 0;
          padding: 35px 22px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          background: rgba(15, 19, 29, 0.9);
        }

        .bigIcon {
          font-size: 45px;
          margin-bottom: 15px;
        }

        .emptyBox h1,
        .emptyBox h2 {
          margin: 0;
        }

        .emptyBox p {
          color: #858fa1;
          font-size: 14px;
          line-height: 1.6;
          margin: 12px 0 22px;
        }

        .mainButton {
          display: inline-block;
          padding: 13px 20px;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #168cff,
            #075bd5
          );
          color: white;
          text-decoration: none;
          font-weight: 900;
        }

        .spinner {
          width: 35px;
          height: 35px;
          margin: 0 auto 15px;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #168cff;
          animation: spin 0.8s linear infinite;
        }

        .loadingBox p {
          color: #8993a5;
          margin: 0;
        }

        .bottomActions {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin-top: 24px;
        }

        .bottomActions a {
          color: #7fbfff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 600px) {
          .page {
            padding: 85px 12px 100px;
          }

          .top {
            align-items: flex-start;
            flex-direction: column;
          }

          h1 {
            font-size: 25px;
          }

          .shopButton {
            width: 100%;
            text-align: center;
          }

          .keyCard {
            padding: 15px;
            border-radius: 17px;
          }

          .cardHeader {
            align-items: flex-start;
          }

          .productName {
            font-size: 17px;
          }

          .keyRow {
            align-items: stretch;
            flex-direction: column;
          }

          .copyButton {
            width: 100%;
          }

          .infoGrid {
            grid-template-columns: 1fr;
          }

          .bottomActions {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
