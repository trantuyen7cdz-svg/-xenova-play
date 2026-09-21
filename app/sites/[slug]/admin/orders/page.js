"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const STATUS_OPTIONS = [
  {
    value: "all",
    label: "Tất cả",
  },
  {
    value: "pending",
    label: "Chờ thanh toán",
  },
  {
    value: "paid",
    label: "Đã thanh toán",
  },
  {
    value: "processing",
    label: "Đang xử lý",
  },
  {
    value: "completed",
    label: "Hoàn thành",
  },
  {
    value: "cancelled",
    label: "Đã hủy",
  },
  {
    value: "refunded",
    label: "Đã hoàn tiền",
  },
];

const STATUS_LABELS = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  processing: "Đang xử lý",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  refunded: "Đã hoàn tiền",
};

function formatPrice(value) {
  const number = Number(value || 0);

  return number.toLocaleString("vi-VN") + "đ";
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString(
      "vi-VN",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    );
  } catch {
    return value;
  }
}

export default function WebsiteOrdersPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params?.slug;

  const [session, setSession] = useState(null);
  const [website, setWebsite] = useState(null);

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] =
    useState(false);

  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [search, setSearch] = useState("");

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [saving, setSaving] = useState(false);

  const [newStatus, setNewStatus] =
    useState("");

  const [keyValue, setKeyValue] =
    useState("");

  const [note, setNote] = useState("");

  /* =========================
     LOAD SESSION
  ========================= */

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        router.replace(
          `/sites/${slug}/admin/login`
        );
        return;
      }

      setSession(session);
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, [router, slug]);

  /* =========================
     LOAD WEBSITE
  ========================= */

  useEffect(() => {
    if (!slug) return;

    async function loadWebsite() {
      try {
        const response = await fetch(
          `/api/sites/${slug}/catalog`,
          {
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (!response.ok || !data?.website) {
          throw new Error(
            data?.error ||
              "Không thể tải website"
          );
        }

        setWebsite(data.website);
      } catch (err) {
        console.error(err);

        setError(
          err?.message ||
            "Không thể tải website"
        );
      } finally {
        setLoading(false);
      }
    }

    loadWebsite();
  }, [slug]);

  /* =========================
     LOAD ORDERS
  ========================= */

  async function loadOrders() {
    if (!session?.access_token || !slug) {
      return;
    }

    try {
      setLoadingOrders(true);
      setError("");

      const query =
        statusFilter !== "all"
          ? `?status=${encodeURIComponent(
              statusFilter
            )}`
          : "";

      const response = await fetch(
        `/api/sites/${slug}/admin/orders${query}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ||
            "Không thể tải đơn hàng"
        );
      }

      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Không thể tải đơn hàng"
      );
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [
    session?.access_token,
    slug,
    statusFilter,
  ]);

  /* =========================
     FILTER SEARCH
  ========================= */

  const filteredOrders = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (!keyword) {
      return orders;
    }

    return orders.filter((order) => {
      const text = [
        order.id,
        order.product_name,
        order.customer_name,
        order.customer_email,
        order.customer_phone,
        order.status,
        order.note,
        order.key_value,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [orders, search]);

  /* =========================
     STATISTICS
  ========================= */

  const statistics = useMemo(() => {
    const total = orders.length;

    const pending = orders.filter(
      (item) =>
        item.status === "pending"
    ).length;

    const paid = orders.filter(
      (item) =>
        item.status === "paid"
    ).length;

    const processing = orders.filter(
      (item) =>
        item.status === "processing"
    ).length;

    const completed = orders.filter(
      (item) =>
        item.status === "completed"
    ).length;

    const revenue = orders
      .filter(
        (item) =>
          item.status === "paid" ||
          item.status === "processing" ||
          item.status === "completed"
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.total_amount || 0
          ),
        0
      );

    return {
      total,
      pending,
      paid,
      processing,
      completed,
      revenue,
    };
  }, [orders]);

  /* =========================
     OPEN ORDER
  ========================= */

  function openOrder(order) {
    setSelectedOrder(order);

    setNewStatus(
      order.status || "pending"
    );

    setKeyValue(
      order.key_value || ""
    );

    setNote(order.note || "");
  }

  /* =========================
     UPDATE ORDER
  ========================= */

  async function updateOrder() {
    if (
      !selectedOrder ||
      !session?.access_token
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/sites/${slug}/admin/orders`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            id: selectedOrder.id,
            status: newStatus,
            key_value: keyValue,
            note,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ||
            "Không thể cập nhật đơn hàng"
        );
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === selectedOrder.id
            ? data.order
            : order
        )
      );

      setSelectedOrder(
        data.order
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Không thể cập nhật đơn hàng"
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     DELETE ORDER
  ========================= */

  async function deleteOrder(order) {
    if (
      !order ||
      !session?.access_token
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa đơn #${order.id}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/sites/${slug}/admin/orders`,
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            id: order.id,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ||
            "Không thể xóa đơn hàng"
        );
      }

      setOrders((current) =>
        current.filter(
          (item) =>
            item.id !== order.id
        )
      );

      if (
        selectedOrder?.id === order.id
      ) {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Không thể xóa đơn hàng"
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     LOGOUT
  ========================= */

  async function logout() {
    await supabase.auth.signOut();

    router.replace(
      `/sites/${slug}/admin/login`
    );
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <main className="page">
        <div className="loading">
          Đang tải...
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
            opacity: 0.7;
            font-size: 15px;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <div className="eyebrow">
            WEBSITE ADMIN
          </div>

          <h1>
            {website?.name ||
              "Quản trị website"}
          </h1>

          <div className="slug">
            /sites/{slug}
          </div>
        </div>

        <div className="headerActions">
          <button
            className="secondary"
            onClick={() =>
              router.push(
                `/sites/${slug}/admin`
              )
            }
          >
            ← Dashboard
          </button>

          <button
            className="secondary"
            onClick={() =>
              router.push(
                `/sites/${slug}`
              )
            }
          >
            Xem shop
          </button>

          <button
            className="danger"
            onClick={logout}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <section className="stats">
        <div className="stat">
          <span>Tổng đơn</span>
          <strong>
            {statistics.total}
          </strong>
        </div>

        <div className="stat">
          <span>Chờ thanh toán</span>
          <strong>
            {statistics.pending}
          </strong>
        </div>

        <div className="stat">
          <span>Đang xử lý</span>
          <strong>
            {statistics.processing}
          </strong>
        </div>

        <div className="stat">
          <span>Hoàn thành</span>
          <strong>
            {statistics.completed}
          </strong>
        </div>

        <div className="stat">
          <span>Doanh thu</span>
          <strong>
            {formatPrice(
              statistics.revenue
            )}
          </strong>
        </div>
      </section>

      <section className="toolbar">
        <div className="filters">
          {STATUS_OPTIONS.map(
            (item) => (
              <button
                key={item.value}
                className={
                  statusFilter ===
                  item.value
                    ? "filter active"
                    : "filter"
                }
                onClick={() =>
                  setStatusFilter(
                    item.value
                  )
                }
              >
                {item.label}
              </button>
            )
          )}
        </div>

        <div className="toolbarRight">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Tìm đơn hàng..."
          />

          <button
            className="refresh"
            onClick={loadOrders}
            disabled={
              loadingOrders
            }
          >
            {loadingOrders
              ? "Đang tải..."
              : "↻ Làm mới"}
          </button>
        </div>
      </section>

      <section className="tableCard">
        <div className="tableHeader">
          <h2>
            Đơn hàng
          </h2>

          <span>
            {filteredOrders.length} đơn
          </span>
        </div>

        {loadingOrders ? (
          <div className="empty">
            Đang tải đơn hàng...
          </div>
        ) : filteredOrders.length ===
          0 ? (
          <div className="empty">
            Chưa có đơn hàng.
          </div>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sản phẩm</th>
                  <th>Khách hàng</th>
                  <th>Số lượng</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map(
                  (order) => (
                    <tr
                      key={order.id}
                    >
                      <td>
                        <strong>
                          #{order.id}
                        </strong>
                      </td>

                      <td>
                        <div className="productName">
                          {
                            order.product_name
                          }
                        </div>

                        <div className="muted">
                          Đơn giá:{" "}
                          {formatPrice(
                            order.unit_price
                          )}
                        </div>
                      </td>

                      <td>
                        <div>
                          {order.customer_name ||
                            "Khách hàng"}
                        </div>

                        <div className="muted">
                          {order.customer_email ||
                            order.customer_phone ||
                            "—"}
                        </div>
                      </td>

                      <td>
                        {order.quantity}
                      </td>

                      <td>
                        <strong>
                          {formatPrice(
                            order.total_amount
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`status status-${order.status}`}
                        >
                          {STATUS_LABELS[
                            order.status
                          ] ||
                            order.status}
                        </span>
                      </td>

                      <td>
                        <span className="muted">
                          {formatDate(
                            order.created_at
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="rowActions">
                          <button
                            className="view"
                            onClick={() =>
                              openOrder(
                                order
                              )
                            }
                          >
                            Chi tiết
                          </button>

                          <button
                            className="delete"
                            onClick={() =>
                              deleteOrder(
                                order
                              )
                            }
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedOrder && (
        <div
          className="overlay"
          onClick={() =>
            setSelectedOrder(null)
          }
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modalHeader">
              <div>
                <div className="eyebrow">
                  ORDER
                </div>

                <h2>
                  Đơn #{selectedOrder.id}
                </h2>
              </div>

              <button
                className="close"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                ×
              </button>
            </div>

            <div className="detailGrid">
              <div className="detail">
                <span>
                  Sản phẩm
                </span>

                <strong>
                  {
                    selectedOrder.product_name
                  }
                </strong>
              </div>

              <div className="detail">
                <span>
                  Số lượng
                </span>

                <strong>
                  {selectedOrder.quantity}
                </strong>
              </div>

              <div className="detail">
                <span>
                  Đơn giá
                </span>

                <strong>
                  {formatPrice(
                    selectedOrder.unit_price
                  )}
                </strong>
              </div>

              <div className="detail">
                <span>
                  Tổng tiền
                </span>

                <strong>
                  {formatPrice(
                    selectedOrder.total_amount
                  )}
                </strong>
              </div>

              <div className="detail">
                <span>
                  Khách hàng
                </span>

                <strong>
                  {selectedOrder.customer_name ||
                    "—"}
                </strong>
              </div>

              <div className="detail">
                <span>
                  Email
                </span>

                <strong>
                  {selectedOrder.customer_email ||
                    "—"}
                </strong>
              </div>

              <div className="detail">
                <span>
                  Số điện thoại
                </span>

                <strong>
                  {selectedOrder.customer_phone ||
                    "—"}
                </strong>
              </div>

              <div className="detail">
                <span>
                  Ngày tạo
                </span>

                <strong>
                  {formatDate(
                    selectedOrder.created_at
                  )}
                </strong>
              </div>
            </div>

            <div className="formGroup">
              <label>
                Trạng thái
              </label>

              <select
                value={newStatus}
                onChange={(event) =>
                  setNewStatus(
                    event.target.value
                  )
                }
              >
                {STATUS_OPTIONS.filter(
                  (item) =>
                    item.value !==
                    "all"
                ).map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="formGroup">
              <label>
                KEY / Nội dung giao hàng
              </label>

              <textarea
                value={keyValue}
                onChange={(event) =>
                  setKeyValue(
                    event.target.value
                  )
                }
                placeholder="Nhập key hoặc nội dung giao hàng..."
                rows={4}
              />
            </div>

            <div className="formGroup">
              <label>
                Ghi chú
              </label>

              <textarea
                value={note}
                onChange={(event) =>
                  setNote(
                    event.target.value
                  )
                }
                placeholder="Ghi chú đơn hàng..."
                rows={3}
              />
            </div>

            <div className="modalActions">
              <button
                className="secondary"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                Đóng
              </button>

              <button
                className="primary"
                onClick={updateOrder}
                disabled={saving}
              >
                {saving
                  ? "Đang lưu..."
                  : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(255, 0, 128, 0.1),
              transparent 30%
            ),
            #050505;
          color: #fff;
          padding: 28px;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .eyebrow {
          font-size: 11px;
          letter-spacing: 2px;
          opacity: 0.5;
          margin-bottom: 7px;
        }

        h1 {
          margin: 0;
          font-size: 28px;
        }

        h2 {
          margin: 0;
          font-size: 20px;
        }

        .slug {
          margin-top: 7px;
          font-size: 13px;
          opacity: 0.5;
        }

        .headerActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button {
          border: 0;
          cursor: pointer;
          font: inherit;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .secondary,
        .danger,
        .primary,
        .refresh {
          border-radius: 10px;
          padding: 10px 14px;
          color: #fff;
        }

        .secondary {
          background: #171717;
          border: 1px solid #292929;
        }

        .secondary:hover {
          background: #202020;
        }

        .danger {
          background: #3a1018;
          border: 1px solid #61202d;
        }

        .primary {
          background: #ff1683;
        }

        .refresh {
          background: #171717;
          border: 1px solid #292929;
        }

        .error {
          background: #3a1018;
          border: 1px solid #702536;
          color: #ffb6c8;
          padding: 12px 14px;
          border-radius: 10px;
          margin-bottom: 18px;
        }

        .stats {
          display: grid;
          grid-template-columns:
            repeat(
              5,
              minmax(0, 1fr)
            );
          gap: 12px;
          margin-bottom: 18px;
        }

        .stat {
          background: #101010;
          border: 1px solid #222;
          border-radius: 14px;
          padding: 17px;
        }

        .stat span {
          display: block;
          font-size: 12px;
          opacity: 0.55;
          margin-bottom: 9px;
        }

        .stat strong {
          font-size: 21px;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .filters {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .filter {
          background: #101010;
          border: 1px solid #252525;
          color: #aaa;
          padding: 9px 12px;
          border-radius: 9px;
        }

        .filter.active {
          background: #ff1683;
          border-color: #ff1683;
          color: #fff;
        }

        .toolbarRight {
          display: flex;
          gap: 8px;
        }

        input,
        textarea,
        select {
          width: 100%;
          background: #0d0d0d;
          color: #fff;
          border: 1px solid #292929;
          border-radius: 9px;
          padding: 11px 12px;
          outline: none;
        }

        .toolbarRight input {
          width: 230px;
        }

        input:focus,
        textarea:focus,
        select:focus {
          border-color: #ff1683;
        }

        .tableCard {
          background: #101010;
          border: 1px solid #222;
          border-radius: 15px;
          overflow: hidden;
        }

        .tableHeader {
          padding: 18px;
          border-bottom: 1px solid #222;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .tableHeader span {
          font-size: 12px;
          opacity: 0.5;
        }

        .tableWrap {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }

        th,
        td {
          text-align: left;
          padding: 14px 15px;
          border-bottom: 1px solid #1d1d1d;
          vertical-align: middle;
        }

        th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          opacity: 0.45;
          font-weight: 500;
        }

        td {
          font-size: 13px;
        }

        tr:last-child td {
          border-bottom: 0;
        }

        .productName {
          font-weight: 600;
          margin-bottom: 4px;
        }

        .muted {
          color: #777;
          font-size: 11px;
        }

        .status {
          display: inline-flex;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 11px;
          white-space: nowrap;
        }

        .status-pending {
          background: #3b2d0b;
          color: #ffd96b;
        }

        .status-paid {
          background: #0c3040;
          color: #72d8ff;
        }

        .status-processing {
          background: #30204a;
          color: #d0a5ff;
        }

        .status-completed {
          background: #0c3926;
          color: #65e6a1;
        }

        .status-cancelled {
          background: #3b1418;
          color: #ff8e9c;
        }

        .status-refunded {
          background: #252525;
          color: #aaa;
        }

        .rowActions {
          display: flex;
          gap: 6px;
        }

        .view,
        .delete {
          padding: 7px 10px;
          border-radius: 7px;
          color: #fff;
          font-size: 11px;
        }

        .view {
          background: #202020;
          border: 1px solid #303030;
        }

        .delete {
          background: #351016;
          border: 1px solid #571c27;
        }

        .empty {
          padding: 50px 20px;
          text-align: center;
          opacity: 0.5;
          font-size: 13px;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(
            0,
            0,
            0,
            0.75
          );
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          z-index: 1000;
        }

        .modal {
          width: min(
            700px,
            100%
          );
          max-height: 90vh;
          overflow-y: auto;
          background: #101010;
          border: 1px solid #292929;
          border-radius: 17px;
          padding: 22px;
          box-shadow:
            0 30px 80px
              rgba(0, 0, 0, 0.55);
        }

        .modalHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .close {
          width: 35px;
          height: 35px;
          border-radius: 9px;
          background: #1c1c1c;
          color: #fff;
          font-size: 23px;
        }

        .detailGrid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 10px;
          margin-bottom: 20px;
        }

        .detail {
          background: #0a0a0a;
          border: 1px solid #202020;
          border-radius: 10px;
          padding: 12px;
        }

        .detail span {
          display: block;
          color: #777;
          font-size: 11px;
          margin-bottom: 6px;
        }

        .detail strong {
          display: block;
          font-size: 13px;
          word-break: break-word;
        }

        .formGroup {
          margin-bottom: 15px;
        }

        .formGroup label {
          display: block;
          font-size: 12px;
          color: #aaa;
          margin-bottom: 7px;
        }

        textarea {
          resize: vertical;
          min-height: 80px;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 20px;
        }

        @media (max-width: 900px) {
          .page {
            padding: 17px;
          }

          .header {
            align-items: flex-start;
            flex-direction: column;
          }

          .headerActions {
            justify-content: flex-start;
          }

          .stats {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

          .toolbarRight {
            width: 100%;
          }

          .toolbarRight input {
            flex: 1;
            width: auto;
          }
        }

        @media (max-width: 600px) {
          .stats {
            grid-template-columns:
              1fr 1fr;
          }

          .detailGrid {
            grid-template-columns: 1fr;
          }

          .toolbarRight {
            flex-direction: column;
          }

          .toolbarRight input {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
