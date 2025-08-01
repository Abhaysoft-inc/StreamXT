import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "StreamXT",
  description: "A browser based streaming app",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider signUpFallbackRedirectUrl="/dashboard" >
      <html lang="en" className="dark">
        <body className={``}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
