import React from 'react'
import { Figtree } from 'next/font/google'

const figtree = Figtree({
    subsets: ['bold']
});


const Navbar = () => {


    return (
        <>
            <div className={`${figtree.className} px-6 py-4 items-center align-middle shadow-white shadow-xs `}>

                <div className="flex justify-between items-center">
                    <p className="brand text-2xl">StreamXT</p>

                    <ul className="nav-menu flex gap-4 items-center">
                        <li className="nav-items text-md">Home</li>
                        <li className="nav-items text-md">Pricing</li>
                        <li className="nav-items text-md">Docs</li>
                        <button className='bg-gradient-to-r from-violet-700 via-violet-500 to-violet-800 px-3 py-1 rounded-full cursor-pointer'>Download</button>
                    </ul>
                </div>


            </div>
            {/* <div className="w-full border-b-[0.5px]"></div> */}
        </>
    )
}

export default Navbar