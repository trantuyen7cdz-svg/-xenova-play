"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState({});
  const [balance, setBalance] = useState(0);

  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  async function loadShop() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("Vui lòng đăng nhập để mua KEY.");
        setLoading(false);
        return;
      }

      // =========================
      // LOAD SẢN PHẨM
      // =========================
      const {
        data: productData,
        error: productError,
      } = await supabase
        .from("products")
        .select(
          "id, name, description, price, duration_days, active, is_active, demo_image_url"
        )
        .eq("is_active", true)
        .order("id", { ascending: true });

      if (productError) {
        console.error("PRODUCT ERROR:", productError);
        setMessage("Không thể tải danh sách sản phẩm.");
        setLoading(false);
        return;
      }

      setProducts(productData || []);

      // =========================
      // LOAD VÍ
      // =========================
      const {
        data: walletData,
        error: walletError,
      } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!walletError && walletData) {
        setBalance(Number(walletData.balance || 0));
      } else {
        setBalance(0);
      }

      // =========================
      // LOAD KEY CÒN LẠI
      // =========================
      const {
        data: keyData,
        error: keyError,
      } = await supabase
        .from("keys")
        .select("product_id, status")
        .eq("status", "available");

      if (!keyError) {
        const counts = {};

        for (const item of keyData || []) {
          const productId = String(item.product_id);

          counts[productId] =
            (counts[productId] || 0) + 1;
        }

        setStock(counts);
      } else {
        console.error(
          "KEY STOCK ERROR:",
          keyError
        );
        setStock({});
      }
    } catch (error) {
      console.error("SHOP ERROR:", error);
      setMessage("Đã xảy ra lỗi.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadShop();
  }, []);

  function formatMoney(value) {
    return (
      Number(value || 0).toLocaleString("vi-VN") +
      "đ"
    );
  }

  function openBuy(product) {
    setMessage("");
    setResult(null);
    setSelectedProduct(product);
  }

  function closeBuy() {
    if (buying) return;

    setSelectedProduct(null);
  }

  async function confirmBuy() {
    if (!selectedProduct) return;

    const available =
      stock[String(selectedProduct.id)] || 0;

    if (available <= 0) {
      setSelectedProduct(null);
      setMessage(
        "Sản phẩm hiện đã hết KEY."
      );
      return;
    }

    if (
      balance <
      Number(selectedProduct.price)
    ) {
      setSelectedProduct(null);

      setMessage(
        `Số dư không đủ. Bạn cần ${formatMoney(
          selectedProduct.price
        )} nhưng ví hiện có ${formatMoney(
          balance
        )}.`
      );

      return;
    }

    setBuying(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage(
          "Phiên đăng nhập đã hết hạn."
        );

        setBuying(false);
        return;
      }

      const response = await fetch(
        "/api/buy-key",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            productId:
              selectedProduct.id,
          }),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setMessage(
          data?.message ||
            "Không thể mua KEY."
        );

        setBuying(false);
        return;
      }

      setResult(data);
      setSelectedProduct(null);

      // =========================
      // CẬP NHẬT SỐ DƯ
      // =========================
      setBalance((current) =>
        Math.max(
          0,
          current -
            Number(
              data.amount ||
                selectedProduct.price
            )
        )
      );

      // =========================
      // GIẢM STOCK
      // =========================
      setStock((current) => {
        const id = String(
          selectedProduct.id
        );

        return {
          ...current,
          [id]: Math.max(
            0,
            Number(current[id] || 0) - 1
          ),
        };
      });
    } catch (error) {
      console.error(
        "BUY ERROR:",
        error
      );

      setMessage(
        "Không thể kết nối tới máy chủ."
      );
    }

    setBuying(false);
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>
            Đang tải cửa hàng...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* =========================
            HEADER
        ========================= */}
        <div style={styles.header}>
          <div>
            <div style={styles.badge}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              CỬA HÀNG KEY
            </h1>

            <p style={styles.subtitle}>
              Chọn sản phẩm và mua KEY
              trực tiếp bằng số dư ví.
            </p>
          </div>

          <div style={styles.wallet}>
            <div style={styles.walletLabel}>
              SỐ DƯ
            </div>

            <div style={styles.walletBalance}>
              {formatMoney(balance)}
            </div>

            <a
              href="/deposit"
              style={styles.depositButton}
            >
              + NẠP TIỀN
            </a>
          </div>
        </div>

        {/* =========================
            MESSAGE
        ========================= */}
        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        {/* =========================
            SUCCESS
        ========================= */}
        {result && (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>
              ✓
            </div>

            <h2 style={styles.successTitle}>
              MUA KEY THÀNH CÔNG
            </h2>

            <p style={styles.successText}>
              {result.product_name}
            </p>

            <div style={styles.keyBox}>
              <code style={styles.keyCode}>
                {result.key_code}
              </code>

              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      result.key_code
                    );

                    alert(
                      "Đã copy KEY!"
                    );
                  } catch {
                    alert(
                      "Không thể copy KEY."
                    );
                  }
                }}
                style={styles.copyButton}
              >
                COPY
              </button>
            </div>

            <div style={styles.successInfo}>
              Đã thanh toán:{" "}
              {formatMoney(
                result.amount
              )}
            </div>

            <div style={styles.successActions}>
              <a
                href="/keys"
                style={styles.primaryButton}
              >
                🔑 XEM KEY CỦA TÔI
              </a>

              <button
                onClick={() =>
                  setResult(null)
                }
                style={
                  styles.secondaryButton
                }
              >
                TIẾP TỤC MUA
              </button>
            </div>
          </div>
        )}

        {/* =========================
            EMPTY
        ========================= */}
        {!result &&
          products.length === 0 && (
            <div style={styles.empty}>
              Hiện chưa có sản phẩm nào.
            </div>
          )}

        {/* =========================
            PRODUCTS
        ========================= */}
        {!result &&
          products.length > 0 && (
            <div style={styles.grid}>
              {products.map(
                (product) => {
                  const count =
                    stock[
                      String(product.id)
                    ] || 0;

                  const canBuy =
                    count > 0 &&
                    balance >=
                      Number(
                        product.price
                      );

                  return (
                    <div
                      key={product.id}
                      style={styles.card}
                    >
                      <div
                        style={
                          styles.cardTop
                        }
                      >
                        <div
                          style={
                            styles.productIcon
                          }
                        >
                          🔑
                        </div>

                        <div
                          style={{
                            ...styles.stock,
                            ...(count > 0
                              ? styles.stockAvailable
                              : styles.stockEmpty),
                          }}
                        >
                          {count > 0
                            ? `${count} KEY CÒN`
                            : "HẾT KEY"}
                        </div>
                      </div>

                      {/* =================
                          ẢNH DEMO
                      ================= */}
                      {product.demo_image_url && (
                        <div
                          style={
                            styles.shopDemo
                          }
                        >
                          <img
                            src={
                              product.demo_image_url
                            }
                            alt={`Demo ${product.name}`}
                            style={
                              styles.shopDemoImage
                            }
                          />
                        </div>
                      )}

                      <h2
                        style={
                          styles.productName
                        }
                      >
                        {product.name}
                      </h2>

                      <p
                        style={
                          styles.description
                        }
                      >
                        {product.description ||
                          "KEY XENOVA PLAY"}
                      </p>

                      <div
                        style={
                          styles.price
                        }
                      >
                        {formatMoney(
                          product.price
                        )}
                      </div>

                      <div
                        style={
                          styles.duration
                        }
                      >
                        ⏱ Thời hạn:{" "}
                        <strong>
                          {
                            product.duration_days
                          }{" "}
                          ngày
                        </strong>
                      </div>

                      <button
                        disabled={!canBuy}
                        onClick={() =>
                          openBuy(product)
                        }
                        style={{
                          ...styles.buyButton,
                          ...(canBuy
                            ? {}
                            : styles.buyDisabled),
                        }}
                      >
                        {count <= 0
                          ? "HẾT KEY"
                          : balance <
                            Number(
                              product.price
                            )
                          ? "KHÔNG ĐỦ SỐ DƯ"
                          : "MUA NGAY"}
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          )}

        {/* =========================
            BOTTOM LINKS
        ========================= */}
        <div style={styles.bottomLinks}>
          <a href="/orders">
            📦 Đơn hàng
          </a>

          <a href="/keys">
            🔑 KEY của tôi
          </a>

          <a href="/dashboard">
            👤 Tài khoản
          </a>
        </div>
      </div>

      {/* =========================
          CONFIRM MODAL
      ========================= */}
      {selectedProduct && (
        <div
          style={
            styles.modalOverlay
          }
        >
          <div style={styles.modal}>
            <div
              style={
                styles.modalIcon
              }
            >
              🔑
            </div>

            <h2
              style={
                styles.modalTitle
              }
            >
              XÁC NHẬN MUA KEY
            </h2>

            <p
              style={
                styles.modalProduct
              }
            >
              {selectedProduct.name}
            </p>

            {/* ẢNH DEMO TRONG MODAL */}
            {selectedProduct.demo_image_url && (
              <div
                style={
                  styles.modalDemo
                }
              >
                <img
                  src={
                    selectedProduct.demo_image_url
                  }
                  alt={`Demo ${selectedProduct.name}`}
                  style={
                    styles.modalDemoImage
                  }
                />
              </div>
            )}

            <div style={styles.modalRow}>
              <span>Giá:</span>

              <strong>
                {formatMoney(
                  selectedProduct.price
                )}
              </strong>
            </div>

            <div style={styles.modalRow}>
              <span>
                Số dư hiện tại:
              </span>

              <strong>
                {formatMoney(balance)}
              </strong>
            </div>

            <div style={styles.modalRow}>
              <span>
                Số dư sau khi mua:
              </span>

              <strong>
                {formatMoney(
                  balance -
                    Number(
                      selectedProduct.price
                    )
                )}
              </strong>
            </div>

            <div
              style={
                styles.modalActions
              }
            >
              <button
                onClick={closeBuy}
                disabled={buying}
                style={
                  styles.cancelButton
                }
              >
                HỦY
              </button>

              <button
                onClick={confirmBuy}
                disabled={buying}
                style={
                  styles.confirmButton
                }
              >
                {buying
                  ? "ĐANG XỬ LÝ..."
                  : "XÁC NHẬN MUA"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #111d36 0%, #070b12 42%, #05070b 100%)",
    color: "#fff",
    padding: "25px 15px 60px",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "25px",
    marginBottom: "30px",
  },

  badge: {
    display: "inline-block",
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#101b30",
    border: "1px solid #263c65",
    color: "#72a9ff",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "1px",
  },

  title: {
    fontSize:
      "clamp(30px, 5vw, 48px)",
    margin: "12px 0 7px",
    letterSpacing: "-1px",
  },

  subtitle: {
    color: "#7f8ba0",
    margin: 0,
    lineHeight: 1.6,
  },

  wallet: {
    minWidth: "210px",
    padding: "16px",
    borderRadius: "15px",
    background: "#0d1420",
    border: "1px solid #202d42",
  },

  walletLabel: {
    color: "#718097",
    fontSize: "11px",
  },

  walletBalance: {
    fontSize: "24px",
    fontWeight: "900",
    margin: "4px 0 12px",
  },

  depositButton: {
    display: "block",
    textAlign: "center",
    padding: "9px",
    borderRadius: "8px",
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontWeight: "800",
    fontSize: "12px",
  },

  message: {
    padding: "14px 16px",
    marginBottom: "20px",
    borderRadius: "12px",
    background: "#241417",
    border: "1px solid #5b292f",
    color: "#ff8e96",
  },

  successBox: {
    padding: "25px",
    marginBottom: "25px",
    borderRadius: "18px",
    background: "#0d1b15",
    border: "1px solid #214e37",
    textAlign: "center",
  },

  successIcon: {
    width: "48px",
    height: "48px",
    margin: "0 auto 10px",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#174a31",
    color: "#6dff9d",
    fontSize: "25px",
    fontWeight: "900",
  },

  successTitle: {
    margin: "5px 0",
  },

  successText: {
    color: "#8d9aaa",
  },

  keyBox: {
    maxWidth: "650px",
    margin: "18px auto",
    padding: "12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#070b10",
    border: "1px solid #26352f",
    borderRadius: "10px",
  },

  keyCode: {
    flex: 1,
    minWidth: 0,
    overflowWrap: "anywhere",
    fontSize: "14px",
  },

  copyButton: {
    border: 0,
    padding: "9px 12px",
    borderRadius: "7px",
    background: "#fff",
    color: "#000",
    fontWeight: "800",
    cursor: "pointer",
  },

  successInfo: {
    color: "#7f9187",
    fontSize: "13px",
  },

  successActions: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "18px",
  },

  primaryButton: {
    padding: "11px 15px",
    borderRadius: "9px",
    background: "#fff",
    color: "#000",
    textDecoration: "none",
    fontWeight: "800",
    fontSize: "13px",
  },

  secondaryButton: {
    padding: "11px 15px",
    borderRadius: "9px",
    background: "#151d29",
    color: "#fff",
    border: "1px solid #29364b",
    fontWeight: "800",
    cursor: "pointer",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "16px",
  },

  card: {
    padding: "20px",
    borderRadius: "17px",
    background:
      "linear-gradient(145deg, #111927, #0b111b)",
    border: "1px solid #202d42",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  productIcon: {
    fontSize: "30px",
  },

  stock: {
    padding: "6px 8px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: "800",
  },

  stockAvailable: {
    background: "#123521",
    color: "#61e28b",
  },

  stockEmpty: {
    background: "#35171a",
    color: "#ff777d",
  },

  shopDemo: {
    marginTop: "15px",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#070b10",
    border: "1px solid #26344a",
  },

  shopDemoImage: {
    display: "block",
    width: "100%",
    maxHeight: "280px",
    objectFit: "contain",
    background: "#070b10",
  },

  productName: {
    margin: "18px 0 7px",
    fontSize: "21px",
  },

  description: {
    minHeight: "42px",
    color: "#7c899c",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  price: {
    marginTop: "18px",
    fontSize: "25px",
    fontWeight: "900",
  },

  duration: {
    marginTop: "8px",
    color: "#8995a8",
    fontSize: "13px",
  },

  buyButton: {
    width: "100%",
    marginTop: "18px",
    padding: "13px",
    border: 0,
    borderRadius: "10px",
    background: "#fff",
    color: "#000",
    fontWeight: "900",
    cursor: "pointer",
  },

  buyDisabled: {
    background: "#202733",
    color: "#707b8d",
    cursor: "not-allowed",
  },

  empty: {
    padding: "50px",
    textAlign: "center",
    borderRadius: "15px",
    background: "#0d1420",
    color: "#7d899c",
  },

  loading: {
    padding: "100px 20px",
    textAlign: "center",
    color: "#8b98aa",
  },

  bottomLinks: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "20px",
    marginTop: "35px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "grid",
    placeItems: "center",
    padding: "18px",
    background: "rgba(0,0,0,.72)",
    overflowY: "auto",
  },

  modal: {
    width: "100%",
    maxWidth: "430px",
    padding: "25px",
    borderRadius: "18px",
    background: "#0d1420",
    border: "1px solid #293850",
    boxShadow:
      "0 25px 80px rgba(0,0,0,.5)",
  },

  modalIcon: {
    textAlign: "center",
    fontSize: "38px",
  },

  modalTitle: {
    textAlign: "center",
    margin: "10px 0 5px",
  },

  modalProduct: {
    textAlign: "center",
    color: "#7e8ba0",
    marginBottom: "18px",
  },

  modalDemo: {
    marginBottom: "18px",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#070b10",
    border: "1px solid #26344a",
  },

  modalDemoImage: {
    display: "block",
    width: "100%",
    maxHeight: "220px",
    objectFit: "contain",
    background: "#070b10",
  },

  modalRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    padding: "12px 0",
    borderBottom:
      "1px solid #202b3d",
    color: "#8591a3",
  },

  modalActions: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1.5fr",
    gap: "10px",
    marginTop: "22px",
  },

  cancelButton: {
    padding: "12px",
    borderRadius: "9px",
    border: "1px solid #2b374a",
    background: "#151d29",
    color: "#fff",
    fontWeight: "800",
    cursor: "pointer",
  },

  confirmButton: {
    padding: "12px",
    borderRadius: "9px",
    border: 0,
    background: "#fff",
    color: "#000",
    fontWeight: "900",
    cursor: "pointer",
  },
};
