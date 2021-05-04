import Head from 'next/head';
import Link from 'next/link';
import {FaGithub} from "react-icons/fa";

export default function Home() {
    const createLink = (text: string, href: string) => {
        return <a href={href} className={"hover:underline"}>{text}</a>
    }

    return (
        <div className={"container text-center flex flex-col h-screen max-w-none"}>
            <Head>
                <title>Anonymous Room with a Spatial Environment</title>
                <link rel='icon' href='/favicon.ico'/>
            </Head>
            <div className={"flex-grow flex flex-col justify-center"}>
                <div className={"block text-2xl"}>Anonymous Room with a Spatial Environment</div>
                <Link href='/video-room/'>
                    <a className={"hover:underline text-blue-600 text-lg"}>join the lobby now</a>
                </Link>
                <div className={"text-sm"}>(support for rooms coming soon)</div>
            </div>

            <div className={"flex-shrink m-4 flex-col self-center"}>
                <div className={""}>
                    <p className={"font-bold"}>Technologies:{" "}</p>
                    <p>
                        {createLink("Ably", "https://ably.com/")}{", "}
                        {createLink("Three.js", "https://threejs.org/")}{", "}
                        {createLink("MediaPipe", "https://mediapipe.dev/")}{", "}
                        {createLink("Next.js", "https://nextjs.org/")}{", "}
                        {createLink("React", "https://reactjs.org/")}{", "}
                        {createLink("Pion", "https://pion.ly/")}{", "}
                        {createLink("Cloudflare Pages", "https://cloudflare.com/")}{". "}
                    </p>
                </div>
                <a className={"hover:opacity-20 flex justify-center my-5"} href={"https://github.com/ben-xD/Skelly/"}>
                    <FaGithub className={"hover:opacity-20"} size={32}/>
                </a>
            </div>
        </div>
    );
}
