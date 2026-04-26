"use client"
import Mainbar from '@/components/dashboard/Mainbar'
import Sidebar from '@/components/dashboard/Sidebar'
import React from 'react'
import { ToastContainer } from 'react-toastify'

const Dashboard = () => {


  return (
    <>
      {/* <Navbar /> */}

      <div className="main-screen flex h-[573px] ">
        <div className="sidebar h-screen w-1/5">
          <Sidebar />

        </div>
        <div className="mainbar w-4/5 ">
          <Mainbar />

        </div>
      </div>
      <ToastContainer />
    </>
  )
}

export default Dashboard