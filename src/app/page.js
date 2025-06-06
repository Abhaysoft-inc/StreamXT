"use client"
import Navbar from "@/components/landing/Navbar";
import { DotPattern } from '@/components/magicui/dot-pattern';
import { cn } from "@/lib/utils";
import { TextAnimate } from "@/components/magicui/text-animate";
import { Figtree } from 'next/font/google'
import { Button } from "@/components/ui/button"
import { IconBrandGithub } from "@tabler/icons-react"

const figtree = Figtree({
  subsets: ['latin']
});


import Notif, { notif } from '@/components/landing/notif'

export default function Home() {
  return (
    <>
      <Navbar />
      <div className={`${figtree.className}`}>
        <div className="relative h-[500px] w-full overflow-hidden mt-4">
          <DotPattern width={10} glow={true} cr={0.8} className={cn(
            "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
          )} id="dot" />

          <div className="">

            <div className="flex justify-center pt-20">
              <div className="w-44 flex justify-center">
                <Notif />
              </div>
            </div>
            <div className="flex justify-center pt-6">


              <TextAnimate animation="blurIn" as="h1" className={`text-7xl text-center wrap px-62 whitespace-pre-line leading-none `}>
                {"Lag-free streaming directly from your browser"}
              </TextAnimate>
            </div>
            <div className="flex justify-center mt-10 gap-6">

              <Button className={`bg-white text-black font-semibold cursor-pointer`} >Join the waitlist!</Button>
              <Button className={` text-white font-semibold cursor-pointer`} > <IconBrandGithub /> Contribute to StreamXT</Button>
            </div>



          </div>




        </div>

      </div>

    </>
  );
}
