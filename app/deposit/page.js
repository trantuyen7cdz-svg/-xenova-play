"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const BANK_NAME = "VIETCOMBANK";
const ACCOUNT_NAME = "TRAN VAN TUYEN";
const ACCOUNT_NUMBER = "9365717262";
const QR_IMAGE = "/qr-vietcombank.jpg";

const QUICK_AMOUNTS = [
  10000,
  20000,
  50000,
  100000,
  200000,
  500000,
];

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + "đ";
}

function formatDate(value) {
  if (!value) return "";

  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getRemainingSeconds(expiresAt) {
  if (!expiresAt) return 0;

  const diff =
    new Date(expiresAt).getTime() - Date.now();

  return Math.max(0, Math.floor(diff / 1000));
}

function formatCountdown(seconds) {
  const safe = Math.max(0, seconds);

  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    secs
  ).padStart(2, "0")}`;
}

export default function DepositPage() {
  const [user, setUser] = useState(null);

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [deposits, setDeposits] = useState([]);
  const [selectedDeposit, setSelectedDeposit] = useState(null);

  const [countdown, setCountdown] = useState(0);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // =========================
  // LẤY USER
  // =========================
  async function loadUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    setUser(session.user);
    setLoading(false);
  }

  // =========================
  // LẤY LỊCH SỬ NẠP TIỀN
  // =========================
  async function loadDeposits() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("deposit_requests")
      .select(
        `
        id,
        user_id,
        amount,
        status,
        transfer_content,
        note,
        created_at,
        updated_at,
        expires_at
        `
      )
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (error) {
      console.error("LOAD DEPOSITS ERROR:", error);
      return;
    }

    const list = data || [];

    setDeposits(list);

    // Nếu đang có đơn pending còn hạn
    const active = list.find(
      (item) =>
        item.status === "pending" &&
        item.expires_at &&
        new Date(item.expires_at).getTime() > Date.now()
    );

    if (active) {
      setSelectedDeposit(active);
    } else {
      setSelectedDeposit(null);
    }
  }

  // =========================
  // INIT
  // =========================
  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    loadDeposits();
  }, [user]);

  // =========================
  // COUNTDOWN
  // =========================
  useEffect(() => {
    if (!selectedDeposit?.expires_at) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = getRemainingSeconds(
        selectedDeposit.expires_at
      );

      setCountdown(remaining);

      // Hết thời gian
      if (remaining <= 0) {
        setSelectedDeposit((current) => {
          if (!current) return current;

          return {
            ...current,
            status: "failed",
          };
        });

        setDeposits((current) =>
          current.map((item) =>
            item.id === selectedDeposit.id
              ? {
                  ...item,
                  status: "failed",
                }
              : item
          )
        );
      }
    };

    updateCountdown();

    const timer = setInterval(
      updateCountdown,
      1000
    );

    return () => clearInterval(timer);
  }, [selectedDeposit?.id, selectedDeposit?.expires_at]);

  // =========================
  // CHỌN SỐ TIỀN
  // =========================
  function selectAmount(value) {
    setAmount(String(value));
    setMessage("");
  }

  // =========================
  // TẠO ĐƠN NẠP
  // =========================
  async function createDeposit() {
    setMessage("");
    setMessageType("");

    const numericAmount = Number(amount);

    if (
      !Number.isInteger(numericAmount) ||
      numericAmount < 10000
    ) {
      setMessage(
        "Số tiền nạp tối thiểu là 10.000đ."
      );
      setMessageType("error");
      return;
    }

    if (numericAmount > 100000000) {
      setMessage("Số tiền nạp quá lớn.");
      setMessageType("error");
      return;
    }

    setCreating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("Bạn chưa đăng nhập.");
        setMessageType("error");
        setCreating(false);
        return;
      }

      const response = await fetch(
        "/api/deposit/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            amount: numericAmount,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(
          result.message ||
            "Không thể tạo yêu cầu nạp tiền."
        );
        setMessageType("error");
        setCreating(false);
        return;
      }

      const newDeposit = {
        id: result.depositId,
        user_id: user?.id,
        amount: result.amount,
        status: "pending",
        transfer_content:
          result.transferContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: result.expiresAt,
      };

      setSelectedDeposit(newDeposit);

      setDeposits((current) => [
        newDeposit,
        ...current,
      ]);

      setAmount("");

      setMessage(
        "Đã tạo yêu cầu nạp tiền. Vui lòng chuyển khoản trong 30 phút."
      );
      setMessageType("success");

      setTimeout(() => {
        scrollToPayment(newDeposit.id);
      }, 100);
    } catch (error) {
      console.error("CREATE DEPOSIT ERROR:", error);

      setMessage("Lỗi kết nối server.");
      setMessageType("error");
    } finally {
      setCreating(false);
    }
  }

  // =========================
  // CUỘN ĐẾN ĐƠN
  // =========================
  function scrollToPayment(id) {
    const element = document.getElementById(
      `payment-${id}`
    );

    if (!element) return;

    setSelectedDeposit(
      deposits.find(
        (item) => item.id === id
      ) || selectedDeposit
    );

    setTimeout(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  // =========================
  // CHỌN ĐƠN TRONG LỊCH SỬ
  // =========================
  function selectDeposit(deposit) {
    setSelectedDeposit(deposit);

    setTimeout(() => {
      const element =
        document.getElementById(
          `payment-${deposit.id}`
        );

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 50);
  }

  // =========================
  // COPY
  // =========================
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(
        String(text)
      );

      setMessage("Đã sao chép.");
      setMessageType("success");

      setTimeout(() => {
        setMessage("");
      }, 1500);
    } catch {
      setMessage(
        "Không thể sao chép. Hãy sao chép thủ công."
      );
      setMessageType("error");
    }
  }

  // =========================
  // ĐƠN HIỆN TẠI
  // =========================
  const activeDeposit = selectedDeposit;

  const isExpired =
    activeDeposit?.status === "failed" ||
    (activeDeposit?.expires_at &&
      getRemainingSeconds(
        activeDeposit.expires_at
      ) <= 0);

  const displayCountdown = useMemo(() => {
    return formatCountdown(countdown);
  }, [countdown]);

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Đang tải...
        </div>
      </main>
    );
  }

  // =========================
  // CHƯA ĐĂNG NHẬP
  // =========================
  if (!user) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>
              💰 NẠP TIỀN
            </h1>

            <p style={styles.text}>
              Vui lòng đăng nhập để sử dụng
              chức năng nạp tiền.
            </p>

            <a
              href="/login"
              style={styles.primaryButton}
            >
              ĐĂNG NHẬP
            </a>
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
          <a
            href="/dashboard"
            style={styles.backButton}
          >
            ← Dashboard
          </a>

          <h1 style={styles.mainTitle}>
            💰 NẠP TIỀN
          </h1>

          <p style={styles.subtitle}>
            Nạp tiền vào ví XENOVA
          </p>
        </div>

        {/* =========================
            MESSAGE
        ========================= */}
        {message && (
          <div
            style={
              messageType === "error"
                ? styles.errorMessage
                : styles.successMessage
            }
          >
            {message}
          </div>
        )}

        {/* =========================
            TẠO YÊU CẦU
        ========================= */}
        {!activeDeposit && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>
              💵 Số tiền muốn nạp
            </h2>

            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value)
              }
              placeholder="Nhập số tiền..."
              style={styles.input}
            />

            <div style={styles.quickGrid}>
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  onClick={() =>
                    selectAmount(value)
                  }
                  style={styles.quickButton}
                >
                  {formatMoney(value)}
                </button>
              ))}
            </div>

            <button
              onClick={createDeposit}
              disabled={creating}
              style={{
                ...styles.primaryButton,
                opacity: creating ? 0.6 : 1,
              }}
            >
              {creating
                ? "ĐANG TẠO..."
                : "TẠO YÊU CẦU NẠP TIỀN"}
            </button>

            <p style={styles.note}>
              Sau khi tạo yêu cầu, bạn có
              30 phút để chuyển khoản.
            </p>
          </div>
        )}

        {/* =========================
            THÔNG TIN THANH TOÁN
        ========================= */}
        {activeDeposit && (
          <div
            id={`payment-${activeDeposit.id}`}
            style={styles.paymentCard}
          >
            <div style={styles.paymentHeader}>
              <div style={styles.checkCircle}>
                ✓
              </div>

              <div>
                <h2 style={styles.paymentTitle}>
                  Thông tin thanh toán
                </h2>

                <p style={styles.requestText}>
                  Yêu cầu #{activeDeposit.id}
                </p>
              </div>
            </div>

            {/* COUNTDOWN */}
            {!isExpired ? (
              <div style={styles.timerBox}>
                <div style={styles.timerLabel}>
                  ⏳ THỜI GIAN CÒN LẠI
                </div>

                <div style={styles.timer}>
                  {displayCountdown}
                </div>

                <div style={styles.timerHint}>
                  Vui lòng chuyển khoản trước
                  khi hết thời gian.
                </div>
              </div>
            ) : (
              <div style={styles.expiredBox}>
                <div style={styles.expiredTitle}>
                  ❌ ĐƠN NẠP ĐÃ HẾT HẠN
                </div>

                <div style={styles.expiredText}>
                  Yêu cầu #{activeDeposit.id}
                  đã quá 30 phút và không còn
                  hiệu lực.
                </div>
              </div>
            )}

            {/* QR */}
            {!isExpired && (
              <>
                <div style={styles.qrTitle}>
                  QUÉT MÃ QR ĐỂ CHUYỂN KHOẢN
                </div>

                <div style={styles.qrWrapper}>
                  <img
                    src={QR_IMAGE}
                    alt="QR Vietcombank"
                    style={styles.qrImage}
                  />
                </div>

                <p style={styles.qrNote}>
                  Số tiền trên QR sẽ theo yêu
                  cầu bạn vừa tạo.
                </p>
              </>
            )}

            {/* BANK INFO */}
            <div style={styles.bankCard}>
              <h3 style={styles.bankTitle}>
                🏦 {BANK_NAME}
              </h3>

              <InfoRow
                label="Chủ tài khoản"
                value={ACCOUNT_NAME}
                onCopy={() =>
                  copyText(ACCOUNT_NAME)
                }
              />

              <InfoRow
                label="Số tài khoản"
                value={ACCOUNT_NUMBER}
                onCopy={() =>
                  copyText(ACCOUNT_NUMBER)
                }
              />

              <InfoRow
                label="Số tiền"
                value={formatMoney(
                  activeDeposit.amount
                )}
                green
                onCopy={() =>
                  copyText(
                    activeDeposit.amount
                  )
                }
              />

              <InfoRow
                label="Nội dung"
                value={
                  activeDeposit.transfer_content
                }
                purple
                onCopy={() =>
                  copyText(
                    activeDeposit.transfer_content
                  )
                }
              />
            </div>

            {/* WARNING */}
            <div style={styles.warning}>
              <div style={styles.warningTitle}>
                ⚠️ LƯU Ý
              </div>

              <div>
                Chuyển khoản đúng số tiền:{" "}
                <b>
                  {formatMoney(
                    activeDeposit.amount
                  )}
                </b>
              </div>

              <div>
                Nội dung chuyển khoản:{" "}
                <b>
                  {activeDeposit.transfer_content}
                </b>
              </div>

              <div>
                Sau khi chuyển khoản, vui lòng
                chờ Admin kiểm tra và cộng tiền
                vào ví.
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedDeposit(null);
              }}
              style={styles.secondaryButton}
            >
              + TẠO YÊU CẦU NẠP KHÁC
            </button>
          </div>
        )}

        {/* =========================
            LỊCH SỬ
        ========================= */}
        <div style={styles.card}>
          <h2 style={styles.historyTitle}>
            📋 Lịch sử nạp tiền
          </h2>

          {deposits.length === 0 ? (
            <div style={styles.empty}>
              Chưa có lịch sử nạp tiền.
            </div>
          ) : (
            <div>
              {deposits.map((deposit) => {
                const expired =
                  deposit.status === "failed" ||
                  (deposit.expires_at &&
                    new Date(
                      deposit.expires_at
                    ).getTime() <= Date.now());

                return (
                  <div
                    key={deposit.id}
                    style={
                      styles.historyItem
                    }
                  >
                    <div
                      style={
                        styles.historyLeft
                      }
                    >
                      {/* MÃ ĐƠN BẤM ĐƯỢC */}
                      <button
                        onClick={() =>
                          selectDeposit(
                            deposit
                          )
                        }
                        style={
                          styles.orderButton
                        }
                      >
                        #{deposit.id}
                      </button>

                      <div
                        style={
                          styles.historyDate
                        }
                      >
                        {formatDate(
                          deposit.created_at
                        )}
                      </div>

                      <div
                        style={
                          styles.transferContent
                        }
                      >
                        {
                          deposit.transfer_content
                        }
                      </div>
                    </div>

                    <div
                      style={
                        styles.historyRight
                      }
                    >
                      <div
                        style={
                          styles.historyAmount
                        }
                      >
                        {formatMoney(
                          deposit.amount
                        )}
                      </div>

                      <div
                        style={{
                          ...styles.status,
                          color:
                            deposit.status ===
                            "completed"
                              ? "#45e87b"
                              : expired
                              ? "#ff4d4f"
                              : "#f4c542",
                        }}
                      >
                        {deposit.status ===
                        "completed"
                          ? "HOÀN THÀNH"
                          : expired
                          ? "ĐÃ HẾT HẠN"
                          : "ĐANG CHỜ"}
                      </div>

                      {/* NÚT XEM */}
                      <button
                        onClick={() =>
                          selectDeposit(
                            deposit
                          )
                        }
                        style={
                          styles.viewButton
                        }
                      >
                        XEM
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// =========================
// INFO ROW
// =========================

function InfoRow({
  label,
  value,
  onCopy,
  green,
  purple,
}) {
  return (
    <div style={styles.infoRow}>
      <div style={styles.infoLabel}>
        {label}
      </div>

      <div style={styles.infoRight}>
        <div
          style={{
            ...styles.infoValue,
            ...(green
              ? styles.greenValue
              : {}),
            ...(purple
              ? styles.purpleValue
              : {}),
          }}
        >
          {value}
        </div>

        <button
          onClick={onCopy}
          style={styles.copyButton}
        >
          COPY
        </button>
      </div>
    </div>
  );
}

// =========================
// STYLES
// =========================

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #17162a 0%, #08080d 55%, #050509 100%)",
    color: "#fff",
    padding: "30px 16px 80px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "780px",
    margin: "0 auto",
  },

  loading: {
    textAlign: "center",
    paddingTop: "100px",
    fontSize: "20px",
    fontWeight: "700",
  },

  header: {
    textAlign: "center",
    marginBottom: "25px",
  },

  backButton: {
    display: "inline-block",
    color: "#aaa7ff",
    textDecoration: "none",
    marginBottom: "20px",
    fontWeight: "700",
  },

  mainTitle: {
    fontSize: "36px",
    fontWeight: "900",
    margin: "0 0 8px",
  },

  subtitle: {
    color: "#8f8f9b",
    margin: 0,
    fontSize: "16px",
  },

  card: {
    background:
      "rgba(19, 19, 28, 0.96)",
    border: "1px solid #303044",
    borderRadius: "28px",
    padding: "28px",
    marginBottom: "25px",
    boxShadow:
      "0 15px 50px rgba(0,0,0,0.3)",
  },

  paymentCard: {
    background:
      "rgba(19, 19, 28, 0.98)",
    border: "1px solid #46428a",
    borderRadius: "30px",
    padding: "30px",
    marginBottom: "25px",
    scrollMarginTop: "20px",
  },

  sectionTitle: {
    fontSize: "24px",
    marginTop: 0,
    marginBottom: "20px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "18px",
    borderRadius: "16px",
    border: "1px solid #39394e",
    background: "#0d0d14",
    color: "#fff",
    fontSize: "18px",
    outline: "none",
    marginBottom: "15px",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "18px",
  },

  quickButton: {
    padding: "13px 8px",
    borderRadius: "12px",
    border: "1px solid #393957",
    background: "#151521",
    color: "#aaa7ff",
    fontWeight: "800",
    cursor: "pointer",
  },

  primaryButton: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "17px",
    border: "none",
    borderRadius: "16px",
    background:
      "linear-gradient(135deg, #756cff, #554ce8)",
    color: "#fff",
    fontSize: "17px",
    fontWeight: "900",
    textAlign: "center",
    textDecoration: "none",
    cursor: "pointer",
  },

  secondaryButton: {
    width: "100%",
    padding: "17px",
    borderRadius: "16px",
    border: "1px solid #44445d",
    background: "transparent",
    color: "#ddd",
    fontSize: "17px",
    fontWeight: "900",
    cursor: "pointer",
    marginTop: "20px",
  },

  note: {
    color: "#777785",
    textAlign: "center",
    fontSize: "14px",
    marginBottom: 0,
    marginTop: "15px",
  },

  successMessage: {
    background: "#10351e",
    border: "1px solid #236b3b",
    color: "#62ef91",
    borderRadius: "14px",
    padding: "15px",
    marginBottom: "20px",
    textAlign: "center",
    fontWeight: "700",
  },

  errorMessage: {
    background: "#351414",
    border: "1px solid #712626",
    color: "#ff7777",
    borderRadius: "14px",
    padding: "15px",
    marginBottom: "20px",
    textAlign: "center",
    fontWeight: "700",
  },

  paymentHeader: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "30px",
  },

  checkCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "#103d20",
    color: "#54ef88",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "48px",
    flexShrink: 0,
  },

  paymentTitle: {
    fontSize: "30px",
    margin: 0,
  },

  requestText: {
    color: "#888893",
    margin: "7px 0 0",
    fontSize: "17px",
  },

  timerBox: {
    border: "1px solid #504b8d",
    borderRadius: "20px",
    padding: "20px",
    textAlign: "center",
    background:
      "rgba(81, 76, 155, 0.1)",
    marginBottom: "30px",
  },

  timerLabel: {
    color: "#aaa7ff",
    fontSize: "14px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  timer: {
    fontSize: "48px",
    fontWeight: "900",
    margin: "7px 0",
    color: "#fff",
    letterSpacing: "3px",
  },

  timerHint: {
    color: "#888893",
    fontSize: "13px",
  },

  expiredBox: {
    border: "1px solid #6d2929",
    background:
      "rgba(100, 25, 25, 0.18)",
    borderRadius: "20px",
    padding: "20px",
    textAlign: "center",
    marginBottom: "25px",
  },

  expiredTitle: {
    color: "#ff5d5d",
    fontSize: "20px",
    fontWeight: "900",
    marginBottom: "8px",
  },

  expiredText: {
    color: "#aaa",
    fontSize: "14px",
  },

  qrTitle: {
    textAlign: "center",
    color: "#aaa",
    fontSize: "18px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "20px",
  },

  qrWrapper: {
    width: "min(100%, 440px)",
    margin: "0 auto",
    padding: "20px",
    boxSizing: "border-box",
    background: "#fff",
    borderRadius: "28px",
  },

  qrImage: {
    display: "block",
    width: "100%",
    height: "auto",
    objectFit: "contain",
  },

  qrNote: {
    textAlign: "center",
    color: "#777783",
    fontSize: "14px",
    margin: "18px 0 30px",
  },

  bankCard: {
    border: "1px solid #353548",
    borderRadius: "22px",
    padding: "20px",
    marginBottom: "20px",
  },

  bankTitle: {
    fontSize: "24px",
    marginTop: 0,
    marginBottom: "15px",
  },

  infoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    padding: "17px 0",
    borderBottom:
      "1px solid #2b2b39",
  },

  infoLabel: {
    color: "#9999a4",
    fontSize: "16px",
    flexShrink: 0,
  },

  infoRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },

  infoValue: {
    color: "#fff",
    fontSize: "17px",
    fontWeight: "900",
    textAlign: "right",
    wordBreak: "break-word",
  },

  greenValue: {
    color: "#4ee984",
  },

  purpleValue: {
    color: "#aaa7ff",
  },

  copyButton: {
    border: "1px solid #41415c",
    background: "transparent",
    color: "#aaa7ff",
    padding: "9px 12px",
    borderRadius: "11px",
    fontWeight: "900",
    cursor: "pointer",
    flexShrink: 0,
  },

  warning: {
    background:
      "rgba(105, 75, 0, 0.25)",
    border: "1px solid #705500",
    borderRadius: "18px",
    padding: "20px",
    color: "#e8d078",
    lineHeight: 1.7,
    fontSize: "15px",
  },

  warningTitle: {
    fontSize: "18px",
    fontWeight: "900",
    marginBottom: "5px",
  },

  historyTitle: {
    fontSize: "28px",
    marginTop: 0,
    marginBottom: "20px",
  },

  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    padding: "20px 0",
    borderBottom:
      "1px solid #292936",
  },

  historyLeft: {
    minWidth: 0,
  },

  orderButton: {
    padding: 0,
    border: "none",
    background: "transparent",
    color: "#fff",
    fontSize: "25px",
    fontWeight: "900",
    cursor: "pointer",
  },

  historyDate: {
    color: "#777783",
    marginTop: "7px",
    fontSize: "13px",
  },

  transferContent: {
    color: "#817cff",
    marginTop: "7px",
    fontSize: "14px",
    fontWeight: "700",
  },

  historyRight: {
    textAlign: "right",
    flexShrink: 0,
  },

  historyAmount: {
    fontSize: "20px",
    fontWeight: "900",
  },

  status: {
    marginTop: "7px",
    fontSize: "13px",
    fontWeight: "900",
  },

  viewButton: {
    marginTop: "8px",
    border: "1px solid #41415c",
    background: "transparent",
    color: "#aaa7ff",
    borderRadius: "9px",
    padding: "6px 12px",
    fontWeight: "800",
    cursor: "pointer",
  },

  empty: {
    color: "#777783",
    textAlign: "center",
    padding: "30px 0",
  },
};
