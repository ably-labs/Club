# Club

A video calling app which shows a virtual character instead of your real face, so you can chat anonymously. You can also move around the environment in 2D.

Note: # The code in server directory is not being used at the moment, it will probably be deleted/ heavily modified when I work on adding audio support efficiently.

## Things learnt:

- Forcing WebRTC media over TCP is not recommended, its just a fallback option for strict firewalls. [source](https://stackoverflow.com/questions/44627013/webrtc-media-over-tcp)

## Discoveries:

- Machine learning:MediaPipe library has memory leak. Submitted and pending fix/ release
- Serialization: MessagePack is turning Float32's into Float64, taking up double the space with no benefit. Tried protobuf, but found a bug. Switching to flatbuffers.
