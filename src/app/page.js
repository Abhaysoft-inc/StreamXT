"use client"
import Navbar from "@/components/landing/Navbar";
import { DotPattern } from '@/components/magicui/dot-pattern';
import { cn } from "@/lib/utils";
import { TextAnimate } from "@/components/magicui/text-animate";
import { Figtree } from 'next/font/google'
import { Button } from "@/components/ui/button"
import { IconBrandGithub } from "@tabler/icons-react"
import HeroVideoDialog from "@/components/magicui/hero-video-dialog";


const figtree = Figtree({
  subsets: ['latin']
});


import Notif, { notif } from '@/components/landing/notif'
import { useRouter } from "next/navigation";

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
              <Button className={`  font-semibold cursor-pointer`} variant={"outline"} onClick={githubroute}> <IconBrandGithub /> Contribute to StreamXT</Button>
              <Button className={` font-semibold cursor-pointer`} onClick={navToLogin} >Try Streaming Now!</Button>

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

      </div>

    </>
  );
}
