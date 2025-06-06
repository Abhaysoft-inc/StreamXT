import React from 'react'
import { Figtree } from 'next/font/google'

const figtree = Figtree({

});


const Navbar = () => {


    return (
        <>
            <div className={`${figtree.className} px-10 py-5 items-center bg-transparent `}>

                <div className="flex justify-between items-center">
                    <p className="brand text-2xl">StreamXT</p>

                    <ul className="nav-menu flex gap-6 items-center">
                        <li className="nav-items text-md">Home</li>
                        <li className="nav-items text-md">Pricing</li>
                        <li className="nav-items text-md">Docs</li>
                        <button className='bg-gradient-to-r from-orange-600  via-orange-400 to-orange-600 px-3 py-1 rounded-full cursor-pointer'>Download</button>
                    </ul>
                </div>


            </div>
            <div className="w-full border-b-[0.5px] opacity-10 "></div>
        </>
    )
}

export default Navbar