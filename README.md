# Club

An anonymous video calling app where you can move in a 2D environment.

## Things learnt:

- Forcing WebRTC media over TCP is not recommended, its just a fallback option for strict firewalls. [source](https://stackoverflow.com/questions/44627013/webrtc-media-over-tcp)

## Discoveries:

- Machine learning:MediaPipe library has memory leak. Submitted and pending fix/ release
- Serialization: MessagePack is turning Float32's into Float64, taking up double the space with no benefit. Tried protobuf, but found a bug. Switching to flatbuffers.
