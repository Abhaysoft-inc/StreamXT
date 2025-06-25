"use client"
import Navbar from "@/components/landing/Navbar";
import { DotPattern } from '@/components/magicui/dot-pattern';
import { cn } from "@/lib/utils";
import { TextAnimate } from "@/components/magicui/text-animate";
import { Figtree } from 'next/font/google'
import { Button } from "@/components/ui/button"
import { IconArrowRight, IconArrowRightBar, IconArrowRightFromArc, IconBrandGithub } from "@tabler/icons-react"
import { FaYoutube, FaTwitch, FaVimeoV, FaDailymotion } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { Safari } from "@/components/magicui/safari";
import Notif, { notif } from '@/components/landing/notif'
import { useRouter } from "next/navigation";

const figtree = Figtree({
  subsets: ['latin']
});





export default function Home() {
  const router = useRouter();

  const navToLogin = () => {
    router.push('/auth/signin');
  }

  const githubroute = () => {
    window.location.href = 'https://github.com/Abhaysoft-inc/streamXT/';
  }


  return (
    <>
      <Navbar />
      <div className={`${figtree.className} mb-10`}>
        <div className="relative h-[590px] w-full overflow-hidden mt-2">
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
              <Button className={`  font-semibold cursor-pointer`} variant={"outline"} onClick={githubroute}> <IconBrandGithub /> Contribute to StreamXT</Button>
              <Button className={` font-semibold cursor-pointer`} onClick={navToLogin} >Try Streaming Now!</Button>

            </div>

            <p className="text-center mt-10 flex justify-center gap-2 items-center">
              Stream to multiple streaming platform with just one click <b className="flex gap-1 items-center cursor-pointer ">View all <IconArrowRight size={20} /> </b>
            </p>

            <div className="  mt-10 flex justify-center gap-10">
              <FaYoutube size={45} className="opacity-50 hover:opacity-90" />
              <FaTwitch size={45} className="opacity-50 hover:opacity-90" />
              <FaVimeoV size={45} className="opacity-50 hover:opacity-90" />
              <FaDailymotion size={45} className="opacity-50 hover:opacity-90" />
              <FaXTwitter size={45} className="opacity-50 hover:opacity-90" />
            </div>



          </div>




        </div>

        {/* hero video */}

        {/* <div className="px-60 mt-20">
          <div className="relative">
            <HeroVideoDialog
              className="block dark:hidden"
              animationStyle="from-center"
              videoSrc="https://www.youtube.com/embed/qh3NGpYRG3I?si=4rb-zSdDkVK9qxxb"
              thumbnailSrc="https://startup-template-sage.vercel.app/hero-light.png"
              thumbnailAlt="Hero Video"
            />
            <HeroVideoDialog
              className="hidden dark:block"
              animationStyle="from-center"
              videoSrc="https://www.youtube.com/embed/qh3NGpYRG3I?si=4rb-zSdDkVK9qxxb"
              thumbnailSrc="https://startup-template-sage.vercel.app/hero-dark.png"
              thumbnailAlt="Hero Video"
            />
          </div>

        </div> */}

        <div className="mt-25 mb-30">

          <p className="text-center text-4xl px-30 font-bold">
            "Stream from <span className="text-orange-400">anywhere</span>, <span className="text-blue-400">anytime</span> with any device"
          </p>


          <div className="mt-20 flex">
            <div className="left w-1/2 mx-10">
              <Safari url="streamxt.live" className="size-full" imageSrc={"/screen.png"} />


            </div>

            <div className="right w-1/2 px-10 font-semibold">
              <p className="text-2xl">Go live on multiple streaming platform in <br /> <span className="text-orange-500">one click!</span> </p>

              <p className="mt-6 font-xl font-normal">
                Stop juggling between tabs and tools—broadcast your content to YouTube, Facebook, Twitch, LinkedIn, and more simultaneously with just one click. <br /><br /> Whether you're a gamer, creator, brand, or educator, our powerful multistreaming tool makes it easy to expand your reach, grow your audience, and save time. No complex setup, no extra hardware—just pure simplicity and performance.
              </p>
              <Button className={"mt-10 font-xl font-semibold cursor-pointer"} variant={""}>Go Live!</Button>

            </div>

          </div>

        </div>

      </div>

    </>
  );
}
