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

    setUpdateRemoteFaceMesh(callback: (remoteUserMedias: UserMedia) => void) {
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
                    const faceArray = new Float32Array(message.data);
                    this.updateRemoteFaceMeshs({
                        clientId: message.clientId,
                        normalizedLandmarks1D: faceArray
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

    publishToLobby = async (face: Float32Array) => {
        await this.channel.publish("face", face)
    }

    leaveLobbyPresense = async () => {
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

    async close() {
        this.ablyClient.close()
    }
}