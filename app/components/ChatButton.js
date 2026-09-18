"use client";

export default function ChatButton() {
  return (
    <a
      href="https://zalo.me/84365717262"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat Admin Zalo"
      style={styles.button}
    >
      <span style={styles.icon}>💬</span>

      <span style={styles.text}>
        <strong>Chat Admin</strong>
        <small>Zalo hỗ trợ</small>
      </span>
    </a>
  );
}

const styles = {
  button: {
    position: "fixed",
    right: "16px",
    bottom: "18px",
    zIndex: 9980,

    display: "flex",
    alignItems: "center",
    gap: "9px",

    padding: "10px 13px",
    borderRadius: "14px",

    background:
      "linear-gradient(135deg, #0d6efd, #1554c7)",

    border: "1px solid #438cff",

    color: "#fff",
    textDecoration: "none",

    boxShadow:
      "0 8px 30px rgba(0,0,0,.4)",

    backdropFilter: "blur(10px)",
  },

  icon: {
    width: "36px",
    height: "36px",

    display: "grid",
    placeItems: "center",

    borderRadius: "11px",

    background: "rgba(255,255,255,.15)",

    fontSize: "19px",
  },

  text: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },

  strong: {
    fontSize: "12px",
  },

  small: {
    fontSize: "9px",
    opacity: 0.75,
  },
};
