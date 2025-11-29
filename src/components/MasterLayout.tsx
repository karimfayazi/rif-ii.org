"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar";

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (loading) return "Loading...";
    if (user?.name) return user.name;
    if (userProfile?.full_name) return userProfile.full_name;
    if (user?.username) return user.username;
    if (userProfile?.username) return userProfile.username;
    return "User";
  };

  // Get user designation/department
  const getUserDesignation = () => {
    if (user?.department) return user.department;
    if (userProfile?.department) return userProfile.department;
    return "";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto mb-2"></div>
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Banner - Fixed at top with header content */}
      <header className="bg-[#0b4d2b] text-white fixed top-0 left-0 right-0 z-[60] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-white hover:bg-white/10 lg:hidden"
              aria-label="Toggle sidebar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div>
              <p className="text-sm font-semibold">
                Regional Infrastructure Fund – II in Khyber Pakhtunkhwa
              </p>
              <p className="text-xs text-white/80">
                Management Information System
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold">
                {getUserDisplayName()}
              </p>
              <p className="text-xs text-white/80">
                {getUserDesignation() || "Admin"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-[#0b4d2b] bg-white rounded-lg hover:bg-gray-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Spacer for fixed banner */}
      <div className="h-16"></div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed lg:static inset-y-0 left-0 z-30 bg-gray-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-gray-200`}
          style={{ 
            top: "64px", 
            width: sidebarCollapsed ? "64px" : "256px", 
            minWidth: sidebarCollapsed ? "64px" : "256px", 
            maxWidth: sidebarCollapsed ? "64px" : "256px",
            flexShrink: 0,
            transition: "width 0.3s ease-in-out"
          }}
        >
          <div className="p-4 h-full overflow-y-auto" style={{ width: "100%" }}>
            <Sidebar
              collapsed={sidebarCollapsed}
              setCollapsed={setSidebarCollapsed}
            />
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            style={{ top: "64px" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

