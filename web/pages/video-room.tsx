import Link from 'next/link';
import React, {ReactElement, useEffect, useRef, useState} from 'react';
import Head from 'next/head';
import Layout from '../components/layout';
import VideoRenderer from "../public/ts/VideoRenderer";
import Messaging from "../public/ts/Messaging";
import CallState, {ConnectionState} from "./CallState";

interface Props {
}

const videoWidth = 100

export default function VideoRoom({}: Props): ReactElement {
    const [callState, setCallState] = useState({
        connection: "disconnected" as ConnectionState,
        currentUsers: [] as string[]
    });
    const [currentUsers, setCurrentUsers] = useState([]);
    const renderOutputRef = useRef(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoIsRunning, setVideoIsRunning] = useState(true);
    const videoRenderer = useRef<VideoRenderer>(null);
    const messagingRef = useRef<Messaging>(null);
    const fpsCounter = useRef<HTMLParagraphElement>(null);
    const [callButtonEnabled, setCallButtonEnabled] = useState(true);
    const [hangUpButtonEnabled, setHangUpButtonEnabled] = useState(false);

    const loadCameraFeed = async (videoElement: HTMLVideoElement) => {
        videoElement.srcObject = await navigator.mediaDevices.getUserMedia({
            video: true
        });
    }

    useEffect(() => {
        (async () => {
            setCallButtonEnabled(false)
            setHangUpButtonEnabled(false)

            await loadCameraFeed(videoRef.current);
            videoRenderer.current = new VideoRenderer(videoRef.current, renderOutputRef.current, fpsCounter.current)
            messagingRef.current = new Messaging()

            setCallButtonEnabled(true)
            videoRenderer.current.startRender()
        })();
    }, []);

    const joinCallHandler = async () => {
        console.log('Call started');
        setCallButtonEnabled(false);
        setHangUpButtonEnabled(true);

        const currentUsers = await messagingRef.current.joinRoom();
        setCurrentUsers(currentUsers)
        // TODO display user list
    };

    const hangUpHandler = async () => {
        console.log('Call killed');
        setCallButtonEnabled(true);
        setHangUpButtonEnabled(false);
        await messagingRef.current.exitRoom()
    };

    const toggleTracking = async () => {
        if (!videoIsRunning) {
            videoRenderer.current.startRender()
        } else {
            videoRenderer.current.stopRender()
        }
        setVideoIsRunning(!videoIsRunning)
    }

    return (
        <Layout>
            <Head>
                <title>WebRTC Video Room</title>
            </Head>
            <div className='container'>
                <h1>Only you see you:</h1>
                <video
                    playsInline
                    autoPlay
                    loop
                    width={videoWidth}
                    muted
                    ref={videoRef}
                ></video>
                <h1>Everyone else sees this:</h1>
                <div style={{width: 500, height: 500}}
                     ref={renderOutputRef}
                >
                </div>
                <div>
                <p ref={fpsCounter}>FPS</p>
                </div>
                <div>
                    <button onClick={joinCallHandler} disabled={!callButtonEnabled}>
                        Join call
                    </button>
                    <button onClick={hangUpHandler} disabled={!hangUpButtonEnabled}>
                        Hang up
                    </button>
                    <button onClick={toggleTracking}>
                        {videoIsRunning ? "Pause tracking" : "Resume tracking"}
                    </button>
                </div>
                {CallState({callState})}

                <Link href='/'>
                    <a>Quit</a>
                </Link>
            </div>
        </Layout>
    );
}
