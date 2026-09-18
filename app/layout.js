import "./globals.css";
import Menu from "./components/Menu";
import ChatButton from "./components/ChatButton";

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <Menu />

        {children}

        <ChatButton />
      </body>
    </html>
  );
}
