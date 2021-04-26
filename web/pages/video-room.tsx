import Link from 'next/link';
import React, {ReactElement, useEffect, useRef, useState} from 'react';
import Head from 'next/head';
import Layout from '../components/layout';
import VideoRenderer from "../public/ts/VideoRenderer";
import AblyMessaging from "../public/ts/AblyMessaging";

interface Props {
}

const videoWidth = 100

export default function VideoRoom({}: Props): ReactElement {
    const renderOutputRef = useRef(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoIsRunning, setVideoIsRunning] = useState(true);
    const videoRenderer = useRef<VideoRenderer>(null);
    const messaging = useRef<AblyMessaging>(null);
    const [callButtonEnabled, setCallButtonEnabled] = useState(true);
    const [hangUpButtonEnabled, setHangUpButtonEnabled] = useState(false);

    useEffect(() => {
        (async () => {
            setCallButtonEnabled(false)
            setHangUpButtonEnabled(false)

            videoRenderer.current = new VideoRenderer(videoRef.current, renderOutputRef.current)
            await videoRenderer.current.initialize()

            messaging.current = new AblyMessaging()
            await messaging.current.initialize()
            console.log("Facemesh and messaging initialization complete")

            // TODO signalling
            // const socketio = new SocketIOClient();

            // Add me to the room
            // socketio.joinRoom();

            // webrtc = new WebRTC(videoRef);

            videoRenderer.current.renderKeypoints()
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

    const toggleVideoIsRunning = async () => {
        if (!videoIsRunning) {
            videoRenderer.current.renderKeypoints()
        } else {
            videoRenderer.current.renderStop()
        }
        setVideoIsRunning(!videoIsRunning)
    }

    // // TODO
    // const addIceCandidate = () => {
    //   // Add ice candidate received from remote, to remote peer description
    // };

    return (
        <Layout>
            <Head>
                <title>WebRTC Video Room</title>
                <script src="https://unpkg.com/@tensorflow-models/face-landmarks-detection@0.0.1/dist/face-landmarks-detection.js"></script>
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
                    <button onClick={callHandler} disabled={!callButtonEnabled}>
                        Join call
                    </button>
                    <button onClick={hangUpHandler} disabled={!hangUpButtonEnabled}>
                        Hang up
                    </button>
                    <button onClick={toggleVideoIsRunning}>
                        {videoIsRunning ? "Pause tracking" : "Resume tracking"}
                    </button>
                </div>
                <Link href='/'>
                    <a>Quit</a>
                </Link>
            </div>
        </Layout>
    );
}
