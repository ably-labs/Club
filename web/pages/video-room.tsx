import Link from 'next/link';
import React, {ReactElement, useEffect, useRef, useState} from 'react';
import Head from 'next/head';
import Layout from '../components/layout';
import VideoRenderer from "../public/ts/VideoRenderer";
import Messaging, {CallState} from "../public/ts/Messaging";
import CallStateDisplay from "../public/ts/CallStateDisplay";

interface Props {
    name: string
}

const ORIGINAL_VIDEO_WIDTH = 100

VideoRoom.getInitialProps = ({query: {name}}) => {
    return {name}
}

export default function VideoRoom({}: Props): ReactElement {
    const [usernameField, setUsernameField] = useState('')
    const [username, setUsername] = useState('')
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

    const onChangeName = (event) => {
        setUsernameField(event.target.value)
    }

    const loadCameraFeed = async (videoElement: HTMLVideoElement): Promise<HTMLVideoElement> => {
        videoElement.srcObject = await navigator.mediaDevices.getUserMedia({
            video: true
        });
        return videoElement
    }

    useEffect(() => {
        setCallButtonEnabled(false)
        setHangUpButtonEnabled(false)
        messagingRef.current = new Messaging(username, setCallState);
        videoRenderer.current = new VideoRenderer(videoRef.current, renderOutputRef.current, fpsCounter.current, true);
        (async () => {
            videoRenderer.current.videoElement = await loadCameraFeed(videoRef.current);
            setCallButtonEnabled(true)
        })();
        return () => {
            videoRenderer.current.dispose()
        }
    }, []);

    const connect = async () => {
        setUsername(usernameField)
        messagingRef.current.setUsername(usernameField)
    }

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
            await videoRenderer.current.startRender()
        } else {
            videoRenderer.current.stopRender()
        }
        setVideoIsRunning(!videoIsRunning)
    }

    return (
        <Layout>
            <Head>
                <title>Anonymous Video Calls</title>
            </Head>
            <div className='container'>
                <div>
                    <label className="text-lg" htmlFor={"usernameField"}>What is your preferred name:</label>
                    <input value={usernameField} onChange={onChangeName} name={"usernameField"} enterKeyHint={"enter"}
                           placeholder={"Bob"}
                           aria-label={"Enter a username..."} required={true}/>
                    <button onClick={connect}>Connect</button>
                </div>
                <h1>Only you see you, {(username && username.length > 0) ? username : "anonymous"}:</h1>
                <video
                    playsInline
                    autoPlay
                    loop
                    width={ORIGINAL_VIDEO_WIDTH}
                    muted
                    ref={videoRef}
                ></video>
                <h1>Everyone else sees this:</h1>
                <div ref={renderOutputRef}
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
