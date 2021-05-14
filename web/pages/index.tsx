import Head from 'next/head';
import Link from 'next/link';
import {FaGithub} from "react-icons/fa";
import React from 'react';

const Home = (): React.ReactElement => {
    const createLink = (text: string, href: string) => {
        return <a href={href} className={"hover:underline"}>{text}</a>
    }

    return (
        <div className={"container text-center flex flex-col h-screen max-w-none"}>
            <Head>
                <title>Club2D</title>
                <link rel='icon' href='/favicon.ico'/>
            </Head>
                <div className={"flex-grow flex flex-col justify-center"}>
            <Link href='/video-room/'>
                    <a className={"hover:underline block text-4xl text-blue-500 font-bold"}>Club2D</a>
            </Link>
                    <span className={"block text-2xl text-grey-600"}><span className={"italic"}>anonymous</span> video
                        calls.</span>
                    {/*<div className={"text-sm"}>(support for rooms coming soon)</div>*/}
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
                        {/*{createLink("Pion", "https://pion.ly/")}{", "}*/}
                        {createLink("Cloudflare Pages", "https://cloudflare.com/")}{", "}
                        {createLink("Firebase Functions", "https://firebase.google.com/docs/functions/")}{", "}
                        glued together by <a href={"https://orth.uk"}
                                             className={"hover:underline text-blue-700"}>{"Ben Butterworth"}</a>
                    </p>
                </div>
                <a className={"hover:opacity-20 flex justify-center my-5"} href={"https://github.com/ben-xD/club/"}>
                    <FaGithub className={"hover:opacity-20"} size={32}/>
                </a>
            </div>
        </div>
    );
}

export default Home;