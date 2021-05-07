import Ably, {Realtime} from 'ably/promises'
import {Types} from "ably";
import UserMedia from "./models/UserMedia";

export type ConnectionState = "connected" | "disconnected"

export interface CallState {
    connection: ConnectionState,
    currentUsers: string[]
}

export default class Messaging {
    private ablyClient: Realtime;
    private readonly CHANNEL_ID = "rooms:ben";
    private channel: Types.RealtimeChannelPromise | null = null
    private setCallState: (value: (((prevState: CallState) => CallState) | CallState)) => void;
    private connectedClientIds: string[];
    private username: string;
    private updateRemoteFaceMeshs: (remoteUserMedia: UserMedia) => void
    private removeRemoteUser: (clientId: string) => void

    constructor(username: string,
                setCallState: (value: (((prevState: CallState) => CallState) | CallState)) => void,
    ) {
        this.username = username
        this.setCallState = setCallState
        if (!process.env.NEXT_PUBLIC_ABLY_API_KEY) {
            console.error(`API key is missing, it is ${process.env.NEXT_PUBLIC_ABLY_API_KEY}.`)
        }
        this.connect(username)
    }

    setUpdateRemoteFaceHandler(callback: (remoteUserMedias: UserMedia) => void) {
        this.updateRemoteFaceMeshs = callback
    }

    connect = (username: string, connectedCallback?: () => void) => {
        const options: Ably.Types.ClientOptions = {
            key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
            clientId: username,
        }
        this.ablyClient = new Realtime(options)
        this.ablyClient.connection.on('connected', () => {
            console.log("Connected to Ably.")
            if (connectedCallback) connectedCallback();
        })

        this.ablyClient.connection.on('closed', () => {
            console.log("Disconnected from Ably.")
        });
    }

    setUsername = async (username) => {
        this.username = username
        await this.close()
        this.connect(username, async () => {
            await this.connectToLobby()
        })
        // TODO Use UUID clientId and change the name of the user. And store usernames in an object
    }

    connectToLobby = async (): Promise<void> => {
        const channelOptions: Types.ChannelOptions = {
            params: {
                rewind: "0",
            }
        }
        this.channel = this.ablyClient.channels.get(this.CHANNEL_ID, channelOptions)

        try {
            const presenceMessages = await this.channel.presence.get()
            this.connectedClientIds = presenceMessages.map(presenceMessage => {
                return presenceMessage.clientId
            })

            this.setCallState({
                connection: "connected" as ConnectionState,
                currentUsers: this.connectedClientIds
            })

            this.channel.subscribe("face", (message: Types.Message) => {
                if (message.clientId !== this.username) {
                    // TODO measure the received size
                    const faceMessage = FaceMessageProto.deserializeBinary(message.data)
                    const coordinates = faceMessage.getFaceMeshCoordinates() as Uint8Array
                    const int16Array = new Int16Array((new DataView(coordinates.buffer)).buffer)
                    const coordinatesFloat = new Float32Array(int16Array)
                    const faceMeshColor = faceMessage.getFaceMeshColor()
                    this.updateRemoteFaceMeshs({
                        clientId: message.clientId,
                        normalizedLandmarks1D: coordinatesFloat,
                        faceMeshColor: faceMeshColor
                    })
                }
            })

            this.channel.presence.subscribe("enter", (member) => {
                console.log(`User entered: ${member.clientId}`)
                this.connectedClientIds.push(member.clientId);
                this.setCallState({
                    connection: "connected",
                    currentUsers: this.connectedClientIds
                })
            })

            this.channel.presence.subscribe('leave', (message => {
                this.connectedClientIds = this.connectedClientIds.filter((value, index) => value != message.clientId)
                this.removeRemoteUser(message.clientId)
                this.setCallState({
                    connection: "connected",
                    currentUsers: this.connectedClientIds
                })
            }))
        } catch (e) {
            console.warn(e)
        }
    }

    joinLobbyPresence = async () => {
        await this.channel.presence.enter()
        const presenceMessages = await this.channel.presence.get()
        this.connectedClientIds = presenceMessages.map(presenceMessage => {
            return presenceMessage.clientId
        })
        this.setCallState({
            connection: "connected",
            currentUsers: this.connectedClientIds
        })
    }

    publishToLobby = async (face: Float32Array, faceMeshColor: string) => {
    // TODO reduce vector precision.
        // TODO use flatbuffers
        // TODO use custom serialization
        const message = new FaceMessageProto()
        // cannot just cast it, because negative numbers because huge.
        const int16Array = new Int16Array(face)
        const dataView = new DataView(int16Array.buffer)
        const uint8 = new Uint8Array(dataView.buffer)
        message.setFaceMeshCoordinates(uint8)
        // message.setFaceMeshColor(faceMeshColor)
        const bytes = message.serializeBinary()

        const deserializedMessage = FaceMessageProto.deserializeBinary(bytes)
        const uint8before = message.getFaceMeshCoordinates() as Uint8Array
        const int16Before = new Int16Array(new DataView(uint8before.buffer).buffer)
        const uint8after = deserializedMessage.getFaceMeshCoordinates() as Uint8Array
        const int16After = new Int16Array(new DataView(uint8after.buffer).buffer)
        console.log({int16Before, int16After})
        // const dataViewAgain = new DataView(coordinates.buffer)
        // const int16ArrayAgain = new Int16Array(dataView.buffer)
        // const coordinatesFloat = new Float32Array(int16ArrayAgain)


        const lengthInBytes = bytes.length
        // TODO measure/ save the received size
        await this.channel.publish("face", bytes)
    }

    leaveLobbyPresense = async () => {
        await this.channel.presence.leave()h
        this.connectedClientIds = this.connectedClientIds.filter((value) => value !== this.username)
        this.setCallState({
            connection: "connected",
            currentUsers: this.connectedClientIds
        });
    }

    async exitRoom(): Promise<void> {
        await this.channel.detach()
        this.setCallState({
            connection: "disconnected",
            currentUsers: []
        })
    }

    async close() {
        this.ablyClient.close()
    }

    /**
     *
     * @param removeRemoteUser
     */
    setRemoveRemoteUserHandler(removeRemoteUser: (clientId: string) => void) {
        this.removeRemoteUser = removeRemoteUser
    }
}