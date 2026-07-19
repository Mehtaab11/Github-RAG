import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "../components/AuthGuard";

export const metadata: Metadata = {
  title: "RepoGPT Workspace",
  description: "AI Technical Assistant for Repositories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950">
        {/* The guard catches route shifts anywhere in the app directory */}
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}