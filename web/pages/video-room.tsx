import React, {ReactElement, useEffect, useRef, useState} from 'react';
import Head from 'next/head';
import VideoRenderer from "../public/ts/VideoRenderer";
import Messaging, {CallState, CurrentUsers, User} from "../public/ts/Messaging";
import CallStateDisplay from "../public/ts/CallStateDisplay";
import EditUsernameModal from "../public/ts/ui/EditUsernameModal";
import {generateRandomUsername} from "../public/ts/names";
import {BrowserView} from 'react-device-detect';
import {FaEdit} from "react-icons/fa";
import Layout from "../components/layout";
import {getAllTailwindColors, pickRandomTailwindColor, TailwindColor} from "../public/ts/colors";
import CallControls from "../public/ts/ui/CallControls";
import TextGuide from "../public/ts/ui/TextGuide";

const VideoRoom = (): ReactElement => {
    // Force client side rendering: https://github.com/vercel/next.js/issues/2473#issuecomment-580324241
    const [isComponentMounted, setIsComponentMounted] = useState(false)
    const [loading, setLoading] = useState(true)
    const [username, setUsername] = useState('')
    const [callState, setCallState] = useState<CallState>("disconnected")
    const [currentUsers, setCurrentUsers] = useState<User[]>([])
    const renderOutputRef = useRef(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoRendererRef = useRef<VideoRenderer>(null);
    const messagingRef = useRef<Messaging>(null);
    const fpsCounterRef = useRef<HTMLDivElement>(null);
    const [callIsConnected, setCallIsConnected] = useState(false);
    const [color, setColor] = useState<TailwindColor>({hexCode: "#000000", name: "black"})
    const [allColors] = useState(getAllTailwindColors())

    const DEFAULT_ORIGINAL_VIDEO_WIDTH = 0
    const [originalVideoOn, setOriginalVideoOn] = useState(false)
    const [originalVideoWidth, setOriginalVideoWidth] = useState(DEFAULT_ORIGINAL_VIDEO_WIDTH)
    const [trackingEnabled, setTrackingEnabled] = useState(true)

    // This is a trick to force this component/ and the setup code in useEffect to be called
    // only on the client side, instead of server-side.
    useEffect(() => setIsComponentMounted(true), [])

    useEffect(() => {
        if (isComponentMounted) {
            const randomUsername = generateRandomUsername()
            const randomColor = pickRandomTailwindColor()
            setUsername(randomUsername)
            setColor(randomColor)

            messagingRef.current = new Messaging(randomUsername, randomColor, setCallState, setCurrentUsers);
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
                await messagingRef.current.connect()
                videoRef.current.srcObject = await navigator.mediaDevices.getUserMedia({video: true});
            })();

            return () => {
                videoRendererRef.current.dispose()
                messagingRef.current.close()
            }
        }
    }, [isComponentMounted]);

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
        messagingRef.current.setUsername(newUsername)
        await messagingRef.current.updatePresenceData()
    }

    const closeEditUsernameModalHandler = () => {
        setEditUsernameModalEnabled(false)
    }

    const changeFaceMeshColor = async (newColor: TailwindColor) => {
        messagingRef.current.setColor(newColor)
        setColor(newColor)
        videoRendererRef.current.updateSceneWithLocalFaceMeshColor(newColor.hexCode)
        if (callState === "connected") {
            await messagingRef.current.updatePresenceData()
        }
    }

    const changeFaceMeshSize = (newSize: number) => {
        videoRendererRef.current.updateSceneWithLocalFaceMeshSize(newSize)
    }

    if (!isComponentMounted) {
        return null
    }

    return (
        <Layout>
            <div className='container max-w-none pb-5'>
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
                    <div className={"flex justify-center py-2"}>
                        <p className={"text-gray-700 text-2xl"}>Hey,{" "}</p>
                        <p style={{color: color.hexCode}}
                           className={`text-2xl font-bold mx-2`}>{(username && username.length > 0) ? username : "anonymous"}</p>
                        <button style={{color: color.hexCode}} className={`hover:text-grey-700`}
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
                    <CallControls callIsConnected={callIsConnected} hangUpHandler={hangUpHandler} loading={loading}
                                  joinCallHandler={joinCallHandler} toggleTracking={toggleTracking}
                                  trackingEnabled={trackingEnabled}
                                  toggleOriginalVideoFeed={toggleOriginalVideoFeed}
                                  changeFaceMeshSize={changeFaceMeshSize}
                                  changeFaceMeshColor={changeFaceMeshColor}
                                  allColors={allColors}/>
                    <CallStateDisplay currentUsers={currentUsers}/>
                    <TextGuide/>
                </div>
            </div>
        </Layout>
    );
}

export default VideoRoom;
