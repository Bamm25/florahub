import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import React from "react";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50/50">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
