"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function formatPrice(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return value;
  }
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params?.slug;
  const orderId = params?.orderId;

  const [session, setSession] = useState(null);
  const [order, setOrder] = useState(null);
  const [website, setWebsite] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace(
          `/sites/${slug}/admin/login`
        );
        return;
      }

      setSession(session);

      const response = await fetch(
        `/api/sites/${slug}/orders`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ||
            "Không thể tải đơn hàng"
        );
      }

      const foundOrder = (
        data.orders || []
      ).find(
        (item) =>
          String(item.id) ===
          String(orderId)
      );

      if (!foundOrder) {
        throw new Error(
          "Không tìm thấy đơn hàng"
        );
      }

      setOrder(foundOrder);

      const websiteResponse =
        await fetch(
          `/api/sites/${slug}/catalog`,
          {
            cache: "no-store",
          }
        );

      const websiteData =
        await websiteResponse.json();

      if (
        websiteResponse.ok &&
        websiteData?.website
      ) {
        setWebsite(
          websiteData.website
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Không thể tải trang thanh toán"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (slug && orderId) {
      load();
    }
  }, [slug, orderId]);

  async function refreshOrder() {
    await load();
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading">
          Đang tải đơn hàng...
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            background: #050505;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
          }

          .loading {
            opacity: 0.6;
          }
        `}</style>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="page">
        <div className="errorBox">
          <h2>
            Không thể tải đơn hàng
          </h2>

          <p>
            {error ||
              "Đơn hàng không tồn tại."}
          </p>

          <button
            onClick={() =>
              router.push(
                `/sites/${slug}`
              )
            }
          >
            Quay lại shop
          </button>
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            background: #050505;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: Arial, sans-serif;
          }

          .errorBox {
            width: min(500px, 100%);
            background: #111;
            border: 1px solid #292929;
            border-radius: 16px;
            padding: 25px;
            text-align: center;
          }

          h2 {
            margin: 0 0 10px;
          }

          p {
            color: #888;
          }

          button {
            border: 0;
            border-radius: 10px;
            padding: 11px 16px;
            background: #ff1683;
            color: #fff;
            cursor: pointer;
          }
        `}</style>
      </main>
    );
  }

  const paymentAmount =
    Number(order.total_amount || 0);

  const bankName =
    website?.bank_name || "";

  const accountNumber =
    website?.bank_account_number || "";

  const accountName =
    website?.bank_account_name || "";

  const qrUrl =
    website?.payment_qr_url || "";

  const isCompleted =
    order.status === "completed";

  const isCancelled =
    order.status === "cancelled";

  const isPaid =
    order.status === "paid" ||
    order.status === "processing" ||
    order.status === "completed";

  return (
    <main className="page">
      <header className="header">
        <button
          className="back"
          onClick={() =>
            router.push(
              `/sites/${slug}`
            )
          }
        >
          ← Quay lại shop
        </button>

        <div className="brand">
          {website?.name ||
            "Thanh toán"}
        </div>
      </header>

      <div className="container">
        <div className="title">
          <div className="eyebrow">
            ORDER #{order.id}
          </div>

          <h1>
            Thanh toán đơn hàng
          </h1>

          <p>
            Vui lòng chuyển khoản đúng số tiền
            bên dưới.
          </p>
        </div>

        <section className="grid">
          <div className="card">
            <h2>
              Thông tin đơn hàng
            </h2>

            <div className="row">
              <span>
                Sản phẩm
              </span>

              <strong>
                {order.product_name}
              </strong>
            </div>

            <div className="row">
              <span>
                Số lượng
              </span>

              <strong>
                {order.quantity}
              </strong>
            </div>

            <div className="row">
              <span>
                Đơn giá
              </span>

              <strong>
                {formatPrice(
                  order.unit_price
                )}
              </strong>
            </div>

            <div className="total">
              <span>
                Tổng thanh toán
              </span>

              <strong>
                {formatPrice(
                  paymentAmount
                )}
              </strong>
            </div>

            <div className="statusBox">
              <span>
                Trạng thái
              </span>

              <strong
                className={`status status-${order.status}`}
              >
                {order.status ===
                "pending"
                  ? "Chờ thanh toán"
                  : order.status ===
                    "paid"
                  ? "Đã thanh toán"
                  : order.status ===
                    "processing"
                  ? "Đang xử lý"
                  : order.status ===
                    "completed"
                  ? "Hoàn thành"
                  : order.status ===
                    "cancelled"
                  ? "Đã hủy"
                  : order.status}
              </strong>
            </div>

            <div className="created">
              Tạo lúc:{" "}
              {formatDate(
                order.created_at
              )}
            </div>
          </div>

          <div className="card">
            <h2>
              Thông tin chuyển khoản
            </h2>

            {isCancelled ? (
              <div className="notice danger">
                Đơn hàng này đã bị hủy.
              </div>
            ) : isCompleted ? (
              <div className="notice success">
                Đơn hàng đã hoàn thành.
              </div>
            ) : isPaid ? (
              <div className="notice info">
                Đã nhận trạng thái thanh toán.
                Admin đang xử lý đơn hàng.
              </div>
            ) : (
              <>
                <div className="amount">
                  {formatPrice(
                    paymentAmount
                  )}
                </div>

                {qrUrl && (
                  <div className="qrBox">
                    <img
                      src={qrUrl}
                      alt="QR thanh toán"
                    />
                  </div>
                )}

                <div className="bankInfo">
                  <div>
                    <span>
                      Ngân hàng
                    </span>

                    <strong>
                      {bankName ||
                        "Chưa cấu hình"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Số tài khoản
                    </span>

                    <strong>
                      {accountNumber ||
                        "Chưa cấu hình"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Chủ tài khoản
                    </span>

                    <strong>
                      {accountName ||
                        "Chưa cấu hình"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Số tiền
                    </span>

                    <strong>
                      {formatPrice(
                        paymentAmount
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Nội dung
                    </span>

                    <strong>
                      XENOVA {order.id}
                    </strong>
                  </div>
                </div>

                <div className="notice">
                  Sau khi chuyển khoản,
                  hãy giữ nguyên đơn hàng.
                  Admin sẽ kiểm tra và cập
                  nhật trạng thái.
                </div>
              </>
            )}

            <button
              className="refresh"
              onClick={refreshOrder}
            >
              ↻ Kiểm tra trạng thái
            </button>
          </div>
        </section>

        {order.key_value && (
          <section className="keyCard">
            <div className="eyebrow">
              KEY / NỘI DUNG GIAO HÀNG
            </div>

            <h2>
              Thông tin của bạn
            </h2>

            <div className="key">
              {order.key_value}
            </div>

            <button
              onClick={() =>
                navigator.clipboard?.writeText(
                  order.key_value
                )
              }
            >
              Sao chép
            </button>
          </section>
        )}
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(255, 22, 131, 0.12),
              transparent 32%
            ),
            #050505;
          color: #fff;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          padding-bottom: 50px;
        }

        .header {
          height: 64px;
          padding: 0 20px;
          border-bottom: 1px solid #202020;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .back {
          background: transparent;
          color: #aaa;
          border: 0;
          cursor: pointer;
          font-size: 13px;
        }

        .back:hover {
          color: #fff;
        }

        .brand {
          font-weight: 700;
          font-size: 15px;
        }

        .container {
          width: min(
            1000px,
            calc(100% - 30px)
          );
          margin: 0 auto;
          padding-top: 35px;
        }

        .title {
          margin-bottom: 25px;
        }

        .eyebrow {
          font-size: 11px;
          letter-spacing: 2px;
          color: #777;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0;
          font-size: 30px;
        }

        .title p {
          color: #777;
          margin: 9px 0 0;
          font-size: 13px;
        }

        .grid {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 15px;
        }

        .card {
          background: #101010;
          border: 1px solid #242424;
          border-radius: 16px;
          padding: 22px;
        }

        .card h2 {
          margin: 0 0 20px;
          font-size: 17px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 13px 0;
          border-bottom: 1px solid #1d1d1d;
          font-size: 13px;
        }

        .row span {
          color: #777;
        }

        .row strong {
          text-align: right;
        }

        .total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 18px;
          padding: 15px;
          background: #181018;
          border: 1px solid #38202f;
          border-radius: 11px;
        }

        .total span {
          color: #aaa;
        }

        .total strong {
          color: #ff4c9d;
          font-size: 20px;
        }

        .statusBox {
          margin-top: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .statusBox > span {
          color: #777;
          font-size: 12px;
        }

        .status {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
        }

        .status-pending {
          color: #ffd86b;
          background: #382d0c;
        }

        .status-paid {
          color: #71d8ff;
          background: #0c3040;
        }

        .status-processing {
          color: #d0a5ff;
          background: #30204a;
        }

        .status-completed {
          color: #65e6a1;
          background: #0c3926;
        }

        .status-cancelled {
          color: #ff8e9c;
          background: #3b1418;
        }

        .created {
          color: #555;
          font-size: 11px;
          margin-top: 15px;
        }

        .amount {
          text-align: center;
          font-size: 30px;
          font-weight: 700;
          color: #ff4c9d;
          margin: 5px 0 20px;
        }

        .qrBox {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .qrBox img {
          width: 210px;
          height: 210px;
          object-fit: contain;
          background: #fff;
          border-radius: 10px;
          padding: 7px;
        }

        .bankInfo {
          border: 1px solid #242424;
          border-radius: 11px;
          overflow: hidden;
        }

        .bankInfo > div {
          padding: 11px 13px;
          border-bottom: 1px solid #202020;
        }

        .bankInfo > div:last-child {
          border-bottom: 0;
        }

        .bankInfo span {
          display: block;
          color: #666;
          font-size: 10px;
          margin-bottom: 5px;
        }

        .bankInfo strong {
          display: block;
          font-size: 13px;
          word-break: break-word;
        }

        .notice {
          margin-top: 15px;
          padding: 12px;
          border-radius: 10px;
          background: #181818;
          border: 1px solid #292929;
          color: #999;
          font-size: 12px;
          line-height: 1.5;
        }

        .notice.success {
          color: #65e6a1;
          background: #0b251a;
          border-color: #164e35;
        }

        .notice.info {
          color: #72d8ff;
          background: #0b202a;
          border-color: #154052;
        }

        .notice.danger {
          color: #ff8e9c;
          background: #2b1015;
          border-color: #4b1923;
        }

        .refresh {
          width: 100%;
          margin-top: 12px;
          padding: 11px;
          border: 1px solid #292929;
          border-radius: 10px;
          background: #181818;
          color: #fff;
          cursor: pointer;
        }

        .refresh:hover {
          background: #222;
        }

        .keyCard {
          margin-top: 15px;
          padding: 22px;
          background: #101010;
          border: 1px solid #242424;
          border-radius: 16px;
        }

        .keyCard h2 {
          margin: 0 0 15px;
          font-size: 17px;
        }

        .key {
          padding: 15px;
          border-radius: 10px;
          background: #080808;
          border: 1px solid #292929;
          color: #65e6a1;
          font-family: monospace;
          white-space: pre-wrap;
          word-break: break-word;
          margin-bottom: 10px;
        }

        .keyCard button {
          padding: 9px 13px;
          border: 0;
          border-radius: 9px;
          background: #ff1683;
          color: #fff;
          cursor: pointer;
        }

        @media (max-width: 700px) {
          .container {
            width: min(
              100% - 20px,
              1000px
            );
            padding-top: 25px;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 25px;
          }

          .header {
            padding: 0 12px;
          }
        }
      `}</style>
    </main>
  );
}
