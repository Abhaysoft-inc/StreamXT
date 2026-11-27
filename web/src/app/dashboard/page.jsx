"use client"

import React, { useState } from 'react'
import { ToastContainer } from 'react-toastify'
import Mainbar from '@/components/dashboard/Mainbar'
import Sidebar from '@/components/dashboard/Sidebar'

const Dashboard = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative z-50 h-full w-72 max-w-[80vw] bg-background shadow-2xl">
            <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <Mainbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
      </main>

      <ToastContainer />
    </div>
  )
}

export default Dashboard
