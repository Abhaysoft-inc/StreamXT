import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "StreamXT",
  description: "A browser based streaming app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
