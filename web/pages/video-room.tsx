import Link from 'next/link';
import React, {ReactElement, useEffect, useRef, useState} from 'react';
import Head from 'next/head';
import Layout from '../components/layout';
import VideoRenderer from "../public/ts/VideoRenderer";
import Messaging, {CallState} from "../public/ts/Messaging";
import CallStateDisplay from "../public/ts/CallStateDisplay";
import EditUsernameModal from "../public/ts/EditUsernameModal";
import {generateRandomUsername} from "../public/ts/name_utilities";

export default function VideoRoom(): ReactElement {
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
    const fpsCounter = useRef<HTMLDivElement>(null);
    const [callButtonEnabled, setCallButtonEnabled] = useState(true);
    const [hangUpButtonEnabled, setHangUpButtonEnabled] = useState(false);
    const DEFAULT_ORIGINAL_VIDEO_WIDTH = 0

    const [originalVideoOn, setOriginalVideoOn] = useState(false)
    const [originalVideoWidth, setOriginalVideoWidth] = useState(DEFAULT_ORIGINAL_VIDEO_WIDTH)

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
        videoRenderer.current = new VideoRenderer(videoRef.current, renderOutputRef.current, fpsCounter.current);
        (async () => {
            videoRenderer.current.videoElement = await loadCameraFeed(videoRef.current);
            setCallButtonEnabled(true)
        })();

        setUsername(generateRandomUsername())

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
            await videoRenderer.current.start()
        } else {
            videoRenderer.current.stopRender()
        }
        setVideoIsRunning(!videoIsRunning)
    }

    const toggleOriginalVideo = () => {
        if (!originalVideoOn) {
            setOriginalVideoWidth(0)
        } else {
            setOriginalVideoWidth(200);
        }
        setOriginalVideoOn(!originalVideoOn)
    }

    const [editUsernameModalEnabled, setEditUsernameModalEnabled] = useState(false)
    const showModal = () => {
        setEditUsernameModalEnabled(true)
    }

    const editUsernameHandler = (username?: string, random?: boolean) => {
        if (random) {
            // remove local storage
            // generate new username, and set it
        }
        setUsername(username)
        setEditUsernameModalEnabled(false)
        // TODO save to local storage, and re-read on startup everytime.
    }

    const closeEditUsernameModalHandler = () => {
        setEditUsernameModalEnabled(false)
    }

    return (
        <Layout>
            <Head>
                <title>Anonymous Video Calls</title>
            </Head>
            <div className='container'>
                <EditUsernameModal show={editUsernameModalEnabled}
                                   handleSubmit={editUsernameHandler}
                                   handleClose={closeEditUsernameModalHandler}/>
                <div style={{position: "absolute", top: 0, right: 0}} ref={fpsCounter}/>
                <div>
                    <div>
                        <p className={"text-yellow-400 text-2xl"}>Hello
                            👋, {(username && username.length > 0) ? username : "anonymous"}</p>
                    </div>
                    <button className={"text-green-200"} onClick={showModal}>Edit</button>
                </div>
                <video
                    playsInline
                    autoPlay
                    loop
                    width={originalVideoWidth}
                    muted
                    ref={videoRef}
                ></video>
                <div ref={renderOutputRef}
                >
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
                    <button onClick={toggleOriginalVideo}>
                        {originalVideoOn ? "Hide real video" : "Show real video"}
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
