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
      <span style={styles.bubble}>
        💬
      </span>

      <span style={styles.label}>
        Chat Admin
      </span>
    </a>
  );
}

const styles = {
  button: {
    position: "fixed",
    right: "16px",
    bottom: "18px",
    zIndex: 9990,

    width: "58px",
    height: "58px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    borderRadius: "50%",

    background:
      "linear-gradient(135deg, #1687ff, #075bd4)",

    border: "2px solid rgba(255,255,255,.25)",

    color: "#fff",
    textDecoration: "none",

    boxShadow:
      "0 5px 25px rgba(0,110,255,.45)",

    animation: "xenovaChatPulse 2s infinite",
  },

  bubble: {
    fontSize: "25px",
    lineHeight: 1,
  },

  label: {
    position: "absolute",
    right: "68px",

    whiteSpace: "nowrap",

    padding: "7px 10px",

    borderRadius: "8px",

    background: "#101722",
    border: "1px solid #29384d",

    color: "#fff",

    fontSize: "10px",
    fontWeight: "800",

    opacity: 0,
    pointerEvents: "none",

    transition: "opacity .2s",
  },
};
