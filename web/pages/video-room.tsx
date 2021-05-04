import Link from 'next/link';
import React, {ReactElement, useEffect, useRef, useState} from 'react';
import Head from 'next/head';
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
    const fpsCounterRef = useRef<HTMLDivElement>(null);
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
        videoRenderer.current = new VideoRenderer(videoRef.current, renderOutputRef.current, fpsCounterRef.current);
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
        if (!originalVideoOn) { // turn on
            setOriginalVideoWidth(200);
        } else {
            setOriginalVideoWidth(0)
        }
        setOriginalVideoOn(!originalVideoOn)
    }

    const [editUsernameModalEnabled, setEditUsernameModalEnabled] = useState(false)
    const toggleEditUsernameModal = () => {
        setEditUsernameModalEnabled(!editUsernameModalEnabled)
    }

    const editUsernameHandler = (username?: string) => {
        setUsername(username)
        setEditUsernameModalEnabled(false)
        // TODO save to local storage, and re-read on startup everytime.
    }

    const closeEditUsernameModalHandler = () => {
        setEditUsernameModalEnabled(false)
    }

    return (
        <div className='container justify-center text-center flex flex-col mx-auto'>
            <Head>
                <title>Anonymous Video Calls</title>
            </Head>
            <EditUsernameModal show={editUsernameModalEnabled}
                               handleSubmit={editUsernameHandler}
                               handleClose={closeEditUsernameModalHandler}/>
            <div className={"flex flex-col flex-grow"}>
                <div style={{position: "fixed", top: 0, right: 0}} ref={fpsCounterRef}/>
                <div>
                    <p className={"text-yellow-800 text-2xl"}>Hello
                        👋, {(username && username.length > 0) ? username : "anonymous"}
                        <button className={"text-green-200"} onClick={toggleEditUsernameModal}>📝</button>
                    </p>
                </div>
                <video
                    style={{transform: "scaleX(-1)"}}
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
                    <button className={"bg-green-500 hover:bg-green-700 text-white mx-2 font-bold py-2 px-4 rounded"}
                            onClick={joinCallHandler} disabled={!callButtonEnabled}>
                        Join
                    </button>
                    <button className={"bg-red-500 hover:bg-red-700 text-white mx-2 font-bold py-2 px-4 rounded"}
                            onClick={hangUpHandler} disabled={!hangUpButtonEnabled}>
                        Hang up
                    </button>
                    <button className={"text-gray-700 rounded px-4 py-2 mx-2 hover:bg-gray-300"}
                            onClick={toggleTracking}>
                        {videoIsRunning ? "Pause tracking" : "Resume tracking"}
                    </button>
                    <button className={"text-gray-700 rounded px-4 py-2 mx-2 hover:bg-gray-300"}
                            onClick={toggleOriginalVideo}>
                        {originalVideoOn ? "Debug: Hide real video (local only)" : "Debug: Show real video (local only)"}
                    </button>
                </div>
                {CallStateDisplay({callState})}
            </div>
            <div className={"flex-shrink my-4 hover:underline"}>
                <Link href='/'>
                    <a>Go to homepage</a>
                </Link>
            </div>
        </div>
    );
}
