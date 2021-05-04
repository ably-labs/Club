import Link from 'next/link';
import React, {ReactElement, useEffect, useRef, useState} from 'react';
import Head from 'next/head';
import VideoRenderer from "../public/ts/VideoRenderer";
import Messaging, {CallState} from "../public/ts/Messaging";
import CallStateDisplay from "../public/ts/CallStateDisplay";
import EditUsernameModal from "../public/ts/EditUsernameModal";
import {generateRandomUsername, pickRandomTailwindColor} from "../public/ts/name_utilities";
import {BrowserView} from 'react-device-detect';
import {FaEdit, FaPause, FaPhone, FaPlay} from "react-icons/fa";
import VideoRoomOptions from "../public/ts/ui/videoRoomOptions";

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
    const [color, setColor] = useState(pickRandomTailwindColor())

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
        const username = generateRandomUsername()
        setUsername(username)
        messagingRef.current = new Messaging(username, setCallState);
        videoRenderer.current = new VideoRenderer(videoRef.current, renderOutputRef.current, fpsCounterRef.current);
        (async () => {
            videoRenderer.current.videoElement = await loadCameraFeed(videoRef.current);
            setCallButtonEnabled(true)
            await messagingRef.current.connectToLobby()
        })();

        return () => {
            videoRenderer.current.dispose()
        }
    }, []);

    const joinCallHandler = async () => {
        setCallButtonEnabled(false);
        setHangUpButtonEnabled(true);
        await messagingRef.current.joinLobbyPresence()
    };

    const hangUpHandler = async () => {
        setCallButtonEnabled(true);
        setHangUpButtonEnabled(false);
        await messagingRef.current.leaveLobbyPresense()
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
        messagingRef.current.setUsername(username)
        setColor(pickRandomTailwindColor())
        setEditUsernameModalEnabled(false)
        // TODO save to local storage, and re-read on startup everytime.
    }

    const closeEditUsernameModalHandler = () => {
        setEditUsernameModalEnabled(false)
    }

    return (
        <div className='container align-middle flex flex-col mx-auto'>
            <Head>
                <title>Anonymous Video Calls</title>
            </Head>
            <EditUsernameModal show={editUsernameModalEnabled}
                               handleSubmit={editUsernameHandler}
                               handleClose={closeEditUsernameModalHandler}/>
            <div className={"flex flex-col flex-grow"}>
                <BrowserView>
                    <div style={{position: "fixed", top: 0, right: 0}} ref={fpsCounterRef}/>
                </BrowserView>
                <div className={"flex justify-center"}>
                    <p className={"text-gray-700 text-2xl"}>Hello
                        👋,{" "}
                    </p>
                    <p className={`text-${color}-600 text-2xl font-bold mx-2`}>{(username && username.length > 0) ? username : "anonymous"}</p>
                    <button className={`text-${color}-700 hover:text-${color}-400`} onClick={toggleEditUsernameModal}>
                        <FaEdit size={20}/></button>
                </div>
                <video
                    style={{
                        transform: "scaleX(-1)",
                        paddingLeft: 0,
                        paddingRight: 0,
                        marginLeft: "auto",
                        marginRight: "auto"
                    }}
                    playsInline
                    autoPlay
                    loop
                    width={originalVideoWidth}
                    muted
                    ref={videoRef}
                />
                <div ref={renderOutputRef}/>
                <div className={"flex"}>
                    <div className={"flex"}>
                        <button
                            aria-disabled={!callButtonEnabled}
                            className={"bg-green-500 hover:bg-green-700 text-white mx-2 font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"}
                            onClick={joinCallHandler} disabled={!callButtonEnabled}>
                            Join <FaPhone/>
                        </button>
                    </div>
                    <button className={"bg-indigo-500 hover:bg-indigo-700 text-white mx-2 font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"}
                            onClick={toggleTracking} disabled={!hangUpButtonEnabled}>
                        {videoIsRunning ? <FaPause/> : <FaPlay/>}
                    </button>
                    <button className={"bg-red-500 hover:bg-red-700 text-white mx-2 font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"}
                            onClick={hangUpHandler} disabled={!hangUpButtonEnabled}>
                        Hang up
                    </button>
                    <VideoRoomOptions/>
                </div>
                {CallStateDisplay({callState})}
            </div>
            <div className={"my-4 hover:underline text-blue-400"}>
                <Link href='/'>
                    <a>Back to homepage</a>
                </Link>
            </div>
        </div>
    );
}
