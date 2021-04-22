export default class WebRTC {
  constructor(videoRef: React.MutableRefObject<any>) {
    (async () => {
      console.log(
        `WebRTC running, username: ${process.env.NEXT_PUBLIC_WEBRTC_USERNAME}`
      );
      const constraints = { video: true };
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        videoRef.current.srcObject = mediaStream;

        // TODO specify stun/ turn servers
        const configuration = {
          iceServers: [
            {
              urls: 'stun:142.93.97.78:3478',
              username: process.env.NEXT_PUBLIC_WEBRTC_USERNAME,
              credential: process.env.NEXT_PUBLIC_WEBRTC_PASSWORD,
            },
          ],
        };
        const peerConnection = new RTCPeerConnection(configuration);
        peerConnection.addEventListener('icecandidate', (_event) => {});
        peerConnection.addEventListener(
          'iceconnectionstatechange',
          (_event) => {
            console.log(
              `Connection state changed to ${peerConnection.iceConnectionState}`
            );
          }
        );

        // Connect
        const track = new MediaStreamTrack();
        peerConnection.addTrack(track);
      } catch (e) {
        console.error({ e });
      }
    })();
  }
}
