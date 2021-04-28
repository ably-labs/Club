import Link from 'next/link';
import React, {ReactElement, useEffect, useRef, useState} from 'react';
import Head from 'next/head';
import Layout from '../components/layout';
import VideoRenderer from "../public/ts/VideoRenderer";
import Messaging from "../public/ts/Messaging";

interface Props {
}

const videoWidth = 100

export default function VideoRoom({}: Props): ReactElement {
    const renderOutputRef = useRef(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoIsRunning, setVideoIsRunning] = useState(true);
    const videoRenderer = useRef<VideoRenderer>(null);
    const messaging = useRef<Messaging>(null);
    const [callButtonEnabled, setCallButtonEnabled] = useState(true);
    const [hangUpButtonEnabled, setHangUpButtonEnabled] = useState(false);

    useEffect(() => {
        (async () => {
            setCallButtonEnabled(false)
            setHangUpButtonEnabled(false)

            videoRenderer.current = new VideoRenderer(videoRef.current, renderOutputRef.current)
            await videoRenderer.current.initialize()
            console.log("Facemesh initialization complete")

            messaging.current = new Messaging()
            await messaging.current.initialize()
            console.log("messaging initialization complete")

            // Add me to the room
            // socketio.joinRoom();

            // webrtc = new WebRTC(videoRef);

            videoRenderer.current.renderKeypoints()
            setCallButtonEnabled(true)
        })();
    }, []);

    const joinCallHandler = () => {
        console.log('Call started');
        setCallButtonEnabled(false);
        setHangUpButtonEnabled(true);
    };

    const hangUpHandler = () => {
        console.log('Call killed');
        setCallButtonEnabled(true);
        setHangUpButtonEnabled(false);
    };

    const toggleTracking = async () => {
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
                <Link href='/'>
                    <a>Quit</a>
                </Link>
            </div>
        </Layout>
    );
}
