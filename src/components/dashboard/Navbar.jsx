import React from 'react'
import { Figtree } from 'next/font/google'
import { Button } from '../ui/button';
import Link from 'next/link';
const figtree = Figtree({
    subsets: ['latin']
});

const Navbar = () => {
    return (
        <>

            <div className={`${figtree.className} px-10 py-2 items-center bg-transparent `}>

                <div className="flex justify-between items-center">
                    <Link className="brand text-2xl cursor-pointer" href={'/'}>StreamXT</Link>

                    <ul className="nav-menu flex gap-6 items-center">
                        <Button variant={"outline"} className={'cursor-pointer'}>Upgrade</Button>

                        <li className="nav-items text-md cursor-pointer">My Account</li>

                    </ul>
                </div>


            </div>
            <div className="w-full border-b-[0.5px] opacity-30 bg-white  "></div>

        </>
    )
}

export default Navbar