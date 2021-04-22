import Link from 'next/link';
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Layout from '../components/layout';
import WebRTC from '../public/ts/webrtc';
import SocketIOClient from '../public/ts/SocketIOClient';

interface Props {}

export default function VideoRoom({}: Props): ReactElement {
  const videoRef = useRef(null);
  const [callButtonEnabled, setCallButtonEnabled] = useState(true);
  const [hangUpButtonEnabled, setHangUpButtonEnabled] = useState(false);
  let webrtc: WebRTC;
  useEffect(() => {
    (async () => {
      // TODO signalling
      const socketio = new SocketIOClient();
      // Add me to the room
      socketio.joinRoom();

      webrtc = new WebRTC(videoRef);
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
        <h1>Hello</h1>
        <Link href='/'>
          <a>Go back</a>
        </Link>
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
      </div>
    </Layout>
  );
}
