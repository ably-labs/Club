import Ably, {Realtime} from 'ably/promises'
import {Types} from "ably";
import UserMedia from "./models/UserMedia";
import FaceMessage from "./models/FaceMessage";

export type ConnectionState = "connected" | "disconnected"

export interface CallState {
    connection: ConnectionState,
    currentUsers: string[]
}

/**
 * Uses Ably to send data across all clients.
 */
export default class Messaging {
    private ablyClient: Realtime;
    private readonly CHANNEL_ID = "rooms:lobby";
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

    setUpdateRemoteFaceHandler(callback: (remoteUserMedias: UserMedia) => void): void {
        this.updateRemoteFaceMeshs = callback
    }

    connect = (username: string, connectedCallback?: () => void): void => {
        const options: Ably.Types.ClientOptions = {
            key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
            clientId: username,
            echoMessages: false,
            useBinaryProtocol: true
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

    setUsername = async (username: string): Promise<void> => {
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
                const faceMessage = FaceMessage.decode(message.data)
                this.updateRemoteFaceMeshs({
                    clientId: message.clientId,
                    normalizedLandmarks1D: faceMessage.coordinates,
                    faceMeshColor: faceMessage.color,
                    meshPointSize: faceMessage.meshPointSize,
                    usernameAnchorCoordinates: faceMessage.usernameAnchorCoordinates
                })
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
                this.connectedClientIds = this.connectedClientIds.filter((value) => value != message.clientId)
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

    joinLobbyPresence = async (): Promise<void> => {
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

    publishToLobby = async (faceMeshCoordinates: Uint16Array,
                            faceMeshColor: string,
                            meshPointSize: number,
                            usernameAnchorCoordinates: Uint16Array
    ): Promise<void> => {
        const faceMessage = new FaceMessage(faceMeshCoordinates,
            faceMeshColor,
            meshPointSize,
            usernameAnchorCoordinates
        )
        const int8Array = faceMessage.encode()
        await this.channel.publish("face", int8Array)
    }

    leaveLobbyPresense = async (): Promise<void> => {
        await this.channel.presence.leave()
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

    async close(): Promise<void> {
        this.ablyClient.close()
    }

    /**
     *
     * @param removeRemoteUser
     */
    setRemoveRemoteUserHandler(removeRemoteUser: (clientId: string) => void): void {
        this.removeRemoteUser = removeRemoteUser
    }
}