"use client";

const buttons = [
  {
    title: "LINK TẢI, NHẬN KEY FREE TẠI ĐÂY",
    href: "https://note2s.vip/",
  },
  {
    title: "MUA KEY ANDROID",
    sub: "[ Có Hỗ Trợ Thẻ Cào ]",
    href: "https://zalo.me/84365717262",
  },
  {
    title: "MUA KEY IPHONE",
    sub: "[ Tắt App Đi Ngủ Vẫn Treo ]",
    href: "https://zalo.me/84365717262",
  },
  {
    title: "MUA KEY PC",
    href: "https://zalo.me/84365717262",
  },
  {
    title: "BOX ZALO",
    href: "https://zalo.me/g/xxxxxxxx",
  },
];

export default function Home() {
  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlow} />

      <section style={styles.container}>
        <div style={styles.logoBox}>
          <h1 style={styles.logo}>XENOVA</h1>
          <div style={styles.line} />
          <p style={styles.play}>XENOVA PLAY</p>
        </div>

        <div style={styles.buttons}>
          {buttons.map((button, index) => (
            <a
              key={index}
              href={button.href}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.button}
            >
              <span style={styles.buttonTitle}>{button.title}</span>

              {button.sub && (
                <span style={styles.buttonSub}>{button.sub}</span>
              )}
            </a>
          ))}
        </div>

        <div style={styles.footer}>
          <span>© 2026 XENOVA PLAY</span>
          <span>•</span>
          <span>DIGITAL KEY STORE</span>
        </div>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 50% 10%, #14284b 0%, #080d18 38%, #03050a 100%)",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
    padding: "80px 16px 40px",
  },

  backgroundGlow: {
    position: "fixed",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background: "rgba(0, 119, 255, 0.12)",
    filter: "blur(100px)",
    top: "-150px",
    left: "50%",
    transform: "translateX(-50%)",
    pointerEvents: "none",
  },

  container: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "520px",
    margin: "0 auto",
    textAlign: "center",
  },

  logoBox: {
    marginBottom: "35px",
  },

  logo: {
    margin: 0,
    fontSize: "42px",
    fontWeight: 900,
    letterSpacing: "5px",
    background: "linear-gradient(90deg, #ffffff, #52b6ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  line: {
    width: "75px",
    height: "3px",
    margin: "10px auto 8px",
    borderRadius: "10px",
    background: "linear-gradient(90deg, #1687ff, #65d4ff)",
    boxShadow: "0 0 18px rgba(0,140,255,.8)",
  },

  play: {
    margin: 0,
    fontSize: "13px",
    letterSpacing: "5px",
    color: "#7dbfff",
    fontWeight: 700,
  },

  buttons: {
    display: "flex",
    flexDirection: "column",
    gap: "13px",
  },

  button: {
    width: "100%",
    minHeight: "62px",
    boxSizing: "border-box",
    padding: "13px 18px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textDecoration: "none",
    borderRadius: "15px",
    border: "1px solid rgba(74, 164, 255, .35)",
    background:
      "linear-gradient(135deg, rgba(21, 48, 84, .92), rgba(8, 20, 39, .95))",
    boxShadow:
      "0 8px 25px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06)",
    color: "#fff",
    transition: "transform .2s ease, border-color .2s ease",
  },

  buttonTitle: {
    fontSize: "15px",
    fontWeight: 800,
    letterSpacing: ".4px",
  },

  buttonSub: {
    marginTop: "4px",
    fontSize: "11px",
    color: "#78c5ff",
    fontWeight: 600,
  },

  footer: {
    marginTop: "35px",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    color: "#52647d",
    fontSize: "10px",
    letterSpacing: "1px",
  },
};
