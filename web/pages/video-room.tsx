import Link from 'next/link';
import React, {ReactElement, useEffect, useRef, useState} from 'react';
import Head from 'next/head';
import Layout from '../components/layout';
import FaceMesh from "../public/ts/FaceMesh";
import VideoRenderer from "../public/ts/VideoRenderer";
import AblyMessaging from "../public/ts/AblyMessaging";

interface Props {
}

export default function VideoRoom({}: Props): ReactElement {
    const renderOutputRef = useRef(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoRenderer = useRef<VideoRenderer>(null);
    const messaging = useRef<AblyMessaging>(null);
    const faceMeshRef = useRef<FaceMesh>(null);
    const [callButtonEnabled, setCallButtonEnabled] = useState(true);
    const [hangUpButtonEnabled, setHangUpButtonEnabled] = useState(false);

    useEffect(() => {
        (async () => {
            setCallButtonEnabled(false)
            setHangUpButtonEnabled(false)

            videoRenderer.current = new VideoRenderer(videoRef.current, renderOutputRef.current)
            await videoRenderer.current.initialize()

            faceMeshRef.current = new FaceMesh()
            await faceMeshRef.current.initialize()

            messaging.current = new AblyMessaging()
            await messaging.current.initialize()
            console.log("Facemesh and messaging initialization complete")

            // TODO signalling
            // const socketio = new SocketIOClient();

            // Add me to the room
            // socketio.joinRoom();

            // webrtc = new WebRTC(videoRef);

            setCallButtonEnabled(true)
        })();
    }, []);

    const callHandler = () => {
        console.log('Call pressed');
        setCallButtonEnabled(false);
        setHangUpButtonEnabled(true);
    };

    const hangUpHandler = () => {
        console.log('Call killed');
        setCallButtonEnabled(true);
        setHangUpButtonEnabled(false);
    };

    const renderKeypointsHandler = async () => {
        console.log({facemesh: faceMeshRef.current})
        const predictions = await faceMeshRef.current.getKeypointsFromImage(videoRef.current)
        videoRenderer.current.renderKeypoints(predictions)
    }

    const stopRenderingHandler = async() => {
        videoRenderer.current.renderStop()
    }

    // // TODO
    // const addIceCandidate = () => {
    //   // Add ice candidate received from remote, to remote peer description
    // };

    return (
        <Layout>
            <Head>
                <title>WebRTC Video Room</title>
            </Head>
            <div className='container'>
                <h1>Only you see reality,</h1>
                <video
                    playsInline
                    autoPlay
                    loop
                    width={500}
                    muted
                    ref={videoRef}
                ></video>
                <button onClick={callHandler} disabled={!callButtonEnabled}>
                    Call
                </button>
                <button onClick={hangUpHandler} disabled={!hangUpButtonEnabled}>
                    Hang up
                </button>
                <button onClick={renderKeypointsHandler}>
                    Render keypoints
                </button>
                                <button onClick={stopRenderingHandler}>
                    Stop render
                </button>
                <h1>Others see virtual faces</h1>
                <div style={{width: 500, height: 500}}
                     ref={renderOutputRef}
                >
                </div>
                <Link href='/'>
                    <a>Quit</a>
                </Link>
            </div>
        </Layout>
    );
}
