import Head from 'next/head';
import Link from 'next/link';
import {FaGithub} from "react-icons/fa";
import React from 'react';
import AblyLogo from "../public/ts/ui/AblyLogo";
import Layout from "../components/layout";

const Home = (): React.ReactElement => {
    const createLink = (text: string, href: string) => {
        return <a href={href} className={"hover:underline"}>{text}</a>
    }

    return (
        <Layout>
        <div className={"container text-center flex flex-col h-screen max-w-none text-red-800"}>
            <Head>
                <title>Club2D</title>
                <link rel='icon' href='/favicon.ico'/>
            </Head>
            <div className={"flex-grow flex flex-col justify-center"}>
                <a className={"block text-4xl font-bold text-red-900"}>Club2D</a>
                <span className={"block text-2xl text-red-800 inline-block mt-2"}>anonymous video
                        calls built using <AblyLogo/></span>
                <div className={"flex"}>
                    <Link href='/video-room/'>
                        <a className={"mx-auto hover:underline block bg-white font-bold text-red-400 hover:bg-red-400 hover:text-white button p-4 rounded-full w-32 mt-4"}>ENTER</a>
                    </Link>
                </div>
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
                    </p>
                    <p className={"mt-3"}>by <a href={"https://orth.uk"}
                                                className={"hover:underline text-red-500"}>{"Ben Butterworth"}</a></p>

                </div>
                <a className={"hover:opacity-20 flex justify-center my-5"} href={"https://github.com/ben-xD/club/"}>
                    <FaGithub className={"hover:opacity-20"} size={32}/>
                </a>
            </div>
        </div>
        </Layout>
    );
}

export default Home;