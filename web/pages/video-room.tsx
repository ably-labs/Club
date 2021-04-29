import Link from 'next/link';
import React, {ReactElement, useEffect, useRef, useState} from 'react';
import Head from 'next/head';
import Layout from '../components/layout';
import VideoRenderer from "../public/ts/VideoRenderer";
import Messaging, {CallState} from "../public/ts/Messaging";
import CallStateDisplay from "../public/ts/CallStateDisplay";
import {useRouter} from "next/router";
import { v4 as uuidv4 } from 'uuid';

interface Props {
}

interface RouterParams {
    name: string
}

const videoWidth = 100

export default function VideoRoom({}: Props): ReactElement {
    const {query} = useRouter()
    const name = (() => {
        const {name} = query as unknown as RouterParams
        if (name) {
            return name;
        } else {
            return uuidv4();
        }
    })()

    const [callState, setCallState] = useState<CallState>({
        connection: "disconnected",
        currentUsers: []
    });
    const renderOutputRef = useRef(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoIsRunning, setVideoIsRunning] = useState(true);
    const videoRenderer = useRef<VideoRenderer>(null);
    const messagingRef = useRef<Messaging>(null);
    const fpsCounter = useRef<HTMLParagraphElement>(null);
    const [callButtonEnabled, setCallButtonEnabled] = useState(true);
    const [hangUpButtonEnabled, setHangUpButtonEnabled] = useState(false);

    const loadCameraFeed = async (videoElement: HTMLVideoElement): Promise<HTMLVideoElement> => {
        videoElement.srcObject = await navigator.mediaDevices.getUserMedia({
            video: true
        });
        return videoElement
    }

    useEffect(() => {
        setCallButtonEnabled(false)
        setHangUpButtonEnabled(false)
        videoRenderer.current = new VideoRenderer(videoRef.current, renderOutputRef.current, fpsCounter.current);
        messagingRef.current = new Messaging(name, setCallState);
        (async () => {
            videoRenderer.current.videoElement = await loadCameraFeed(videoRef.current);
            setCallButtonEnabled(true)
            videoRenderer.current.startRender()
        })();
        return () => {
            videoRenderer.current.dispose()
        }
    }, []);

    const joinCallHandler = async () => {
        setCallButtonEnabled(false);
        setHangUpButtonEnabled(true);
        await messagingRef.current.joinRoom()
    };

    const hangUpHandler = async () => {
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
                <h1>Only you see you, {(name && name.length > 0) ? name : "anonymous"}:</h1>
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
                {CallStateDisplay({callState})}

                <Link href='/'>
                    <a>Quit</a>
                </Link>
            </div>
        </Layout>
    );
}
