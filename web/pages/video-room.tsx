import React, {ReactElement, useEffect, useRef, useState} from 'react';
import Head from 'next/head';
import VideoRenderer from "../public/ts/VideoRenderer";
import Messaging, {CallState} from "../public/ts/Messaging";
import CallStateDisplay from "../public/ts/CallStateDisplay";
import EditUsernameModal from "../public/ts/EditUsernameModal";
import {generateRandomUsername} from "../public/ts/names";
import {BrowserView} from 'react-device-detect';
import {FaEdit, FaPause, FaPhone, FaPhoneSlash, FaPlay, FaSpinner} from "react-icons/fa";
import VideoRoomOptions from "../public/ts/ui/videoRoomOptions";
import Layout from "../components/layout";
import {pickRandomTailwindColor} from "../public/ts/colors";

export default function VideoRoom(): ReactElement {
    const [loading, setLoading] = useState(true)
    const [username, setUsername] = useState('')
    const [callState, setCallState] = useState<CallState>({
        connection: "disconnected",
        currentUsers: []
    });
    const renderOutputRef = useRef(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoRendererRef = useRef<VideoRenderer>(null);
    const messagingRef = useRef<Messaging>(null);
    const fpsCounterRef = useRef<HTMLDivElement>(null);
    const [callIsConnected, setCallIsConnected] = useState(false);
    const [color, setColor] = useState(null)

    const DEFAULT_ORIGINAL_VIDEO_WIDTH = 0
    const [originalVideoOn, setOriginalVideoOn] = useState(false)
    const [originalVideoWidth, setOriginalVideoWidth] = useState(DEFAULT_ORIGINAL_VIDEO_WIDTH)
    const [trackingEnabled, setTrackingEnabled] = useState(true)

    useEffect(() => {
        const randomUsername = generateRandomUsername()
        const randomColor = pickRandomTailwindColor()
        setUsername(randomUsername)
        setColor(randomColor.name)
        messagingRef.current = new Messaging(randomUsername, setCallState);
        const frameRate = parseInt(process.env.NEXT_PUBLIC_ABLY_UPLOAD_FRAME_RATE)
        videoRendererRef.current = new VideoRenderer(videoRef.current,
            renderOutputRef.current,
            fpsCounterRef.current,
            messagingRef.current,
            randomUsername,
            {faceMeshColor: randomColor.hexCode, stopLoadingScreenCallback: setLoading},
            frameRate
        );
        messagingRef.current.setUpdateRemoteFaceHandler(videoRendererRef.current.updateRemoteUserMedia);
        messagingRef.current.setRemoveRemoteUserHandler(videoRendererRef.current.removeRemoteUser);
        (async () => {
            videoRef.current.srcObject = await navigator.mediaDevices.getUserMedia({video: true});
            await messagingRef.current.connectToLobby()
        })();

        return () => {
            videoRendererRef.current.dispose()
        }
    }, []);

    const joinCallHandler = async () => {
        videoRendererRef.current.scheduleFaceDataPublishing()
        await messagingRef.current.joinLobbyPresence()
        setCallIsConnected(true);
    };

    const hangUpHandler = async () => {
        videoRendererRef.current.cancelFaceDataPublishing()
        await messagingRef.current.leaveLobbyPresense()
        setCallIsConnected(false);
    };

    const toggleTracking = async () => {
        await videoRendererRef.current.setLocalFaceTrackingTracking(!trackingEnabled)
        setTrackingEnabled(!trackingEnabled)
    }

    const toggleOriginalVideoFeed = () => {
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

    const editUsernameHandler = async (newUsername?: string) => {
        setEditUsernameModalEnabled(false)
        if (!newUsername) {
            return
        }
        setUsername(newUsername)
        videoRendererRef.current.updateUsername(newUsername)
        await messagingRef.current.setUsername(newUsername)
        // TODO save to local storage, and re-read on startup everytime.
    }

    const closeEditUsernameModalHandler = () => {
        setEditUsernameModalEnabled(false)
    }

    const changeFaceMeshColor = (newColor: string) => {
        videoRendererRef.current.changeLocalFaceMeshColor(newColor)
    }

    const changeFaceMeshSize = (newSize: number) => {
        videoRendererRef.current.changeLocalFaceMeshSize(newSize)
    }

    // TODO add text overlay to say "press the green button".
    return (
        <Layout>
            <div className='container max-w-none'>
                <Head>
                    <title>Anonymous Video Calls</title>
                </Head>
                <BrowserView>
                    <div style={{position: "fixed", top: 0, right: 0}} ref={fpsCounterRef}/>
                </BrowserView>
                <EditUsernameModal show={editUsernameModalEnabled}
                                   handleSubmit={editUsernameHandler}
                                   handleClose={closeEditUsernameModalHandler}/>
                <div className={"flex-col align-middle"}>
                    <div className={"flex justify-center my-2"}>
                        <p className={"text-gray-700 text-2xl"}>Hey,{" "}</p>
                        <p className={`text-${color}-600 text-2xl font-bold mx-2`}>{(username && username.length > 0) ? username : "anonymous"}</p>
                        <button className={`text-${color}-700 hover:text-${color}-400`}
                                onClick={toggleEditUsernameModal}>
                            <FaEdit size={16}/></button>
                    </div>
                    <div className={"flex justify-center rounded-md overflow-hidden"}>
                        <video
                            style={{
                                transform: "scaleX(-1)",
                                borderRadius: "16px",
                            }}
                            playsInline
                            autoPlay
                            loop
                            width={originalVideoWidth}
                            muted
                            ref={videoRef}
                        />
                    </div>
                    <div ref={renderOutputRef} className={"flex justify-center"}/>
                    <div className={"flex justify-center my-2"}>
                        <div className={"inline-flex p-4 bg-indigo-100 rounded-full"}>
                            {(callIsConnected) ?
                                <button
                                    className={"bg-red-500 hover:bg-red-700 text-white mx-2 font-bold py-4 px-4 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed"}
                                    onClick={hangUpHandler} disabled={!callIsConnected}>
                                    <FaPhoneSlash/>
                                </button> :
                                (loading) ? <button
                                    className={" bg-green-500 hover:bg-green-700 text-white mx-2 font-bold py-2 px-4 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed"}
                                    disabled={true}>
                                    <FaSpinner className={"animate-spin"}/>
                                </button> : <button
                                    aria-disabled={!callIsConnected}
                                    className={"bg-green-500 hover:bg-green-700 text-white mx-2 font-bold py-2 px-4 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed"}
                                    onClick={joinCallHandler} disabled={callIsConnected}>
                                    <FaPhone/>
                                </button>

                            }
                            <button
                                className={"bg-indigo-500 hover:bg-indigo-700 text-white mx-2 font-bold py-4 px-4 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed"}
                                onClick={toggleTracking}>{trackingEnabled ? <FaPause/> : <FaPlay/>}
                            </button>
                            <VideoRoomOptions toggleOriginalVideoFeed={toggleOriginalVideoFeed}
                                              changeFaceMeshColor={changeFaceMeshColor}
                                              changeFaceMeshSize={changeFaceMeshSize}/>
                        </div>
                    </div>
                    {CallStateDisplay({callState})}
                </div>
            </div>
        </Layout>
    );
}
