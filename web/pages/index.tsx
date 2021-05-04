import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image'

export default function Home() {
    const createLink = (text: string, href: string) => {
        return <a href={href} className={"hover:underline"}>{text}</a>
    }

    return (
        <div className={"container text-center flex flex-col h-screen"}>
            <Head>
                <title>Anonymous Calls</title>
                <link rel='icon' href='/favicon.ico'/>
            </Head>
            <div className={"flex-grow flex flex-col justify-center"}>
                <Link href='/video-room/'>
                    <a className={"block text-blue-900 text-2xl hover:underline"}>Join Anonymous Video Room</a>
                </Link>
                <div>Stay (partially) anonymous.</div>
            </div>

            <div className={"flex-shrink m-4"}>
                <div className={"mb-5"}>
                    <p className={"font-bold"}>Technologies:{" "}</p>
                    <p>
                        {createLink("Ably", "https://ably.com/")}{", "}
                        {createLink("Three.js", "https://threejs.org/")}{", "}
                        {createLink("MediaPipe", "https://mediapipe.dev/")}{", "}
                        {createLink("Next.JS", "https://nextjs.org/")}{", "}
                        {createLink("React", "https://reactjs.org/")}{". "}
                    </p>
                </div>
                <p className={"font-bold hover:underline"}>
                    <a className={"hover:opacity-20"} href={"https://github.com/ben-xD/Skelly/"}>
                    <Image src={"/images/github.png"} width={48} height={48}></Image>
                </a>
                </p>
            </div>
        </div>
    );
}
