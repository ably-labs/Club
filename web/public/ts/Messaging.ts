import Ably, {Realtime} from 'ably/promises'
import {Types} from "ably";
import UserMedia from "./models/UserMedia";
import FaceMessage from "./models/FaceMessage";
import {v4 as uuidv4} from 'uuid';
import {ClientId} from "./models/ClientId";
import {createAuthCallback, requestTokenRequest} from "./auth";

export type ConnectionState = "connected" | "disconnected"

export type User = {
    clientId: string,
    username: string
}

interface PresenceData {
    username: string
}

export interface CallState {
    connection: ConnectionState,
    currentUsers: Map<ClientId, User>
}

/**
 * Uses Ably to send data across all clients.
 */
export default class Messaging {
    private ablyClient: Realtime;
    private readonly CHANNEL_ID = "rooms:lobby";
    private channel: Types.RealtimeChannelPromise | null = null
    private readonly setCallState: (value: (((prevState: CallState) => CallState) | CallState)) => void;
    private connectedClients = new Map<ClientId, User>();
    private readonly clientId: string;
    private username: string;
    private updateRemoteFaceMeshs: (remoteUserMedia: UserMedia) => void
    private removeRemoteUser: (clientId: ClientId) => void

    constructor(username: string,
                setCallState: (value: (((prevState: CallState) => CallState) | CallState)) => void,
    ) {
        this.clientId = uuidv4()
        this.username = username
        this.setCallState = setCallState
    }

    connect = async (): Promise<void> => {
        try {
            const tokenRequest = await requestTokenRequest(this.clientId)
            this.ablyClient = new Realtime({
                clientId: this.clientId,
                echoMessages: false,
                useBinaryProtocol: true,
                token: tokenRequest,
                authCallback: createAuthCallback(this.clientId)
            })
            this.channel = this.ablyClient.channels.get(this.CHANNEL_ID, {
                params: {
                    rewind: "0",
                }
            })
            this.addEventHandlers();
        } catch (e) {
            console.error(e)
            throw new Error("Failed to connect to Ably.")
        }

        this.ablyClient.connection.on('connected', () => {
            console.log("Connected to Ably.")
        })

        this.ablyClient.connection.on('closed', () => {
            console.log("Disconnected from Ably.")
        });
    }

    setUpdateRemoteFaceHandler(callback: (remoteUserMedias: UserMedia) => void): void {
        this.updateRemoteFaceMeshs = callback
    }

    setUsername = async (username: string): Promise<void> => {
        this.username = username
        await this.updatePresence(username)
    }

    private addEventHandlers() {
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
            const {username} = member.data
            console.log(`User entered: ${username} with id${member.clientId}`)
            this.addUser(member)
        })

        this.channel.presence.subscribe('present', (presenceMessage) => {
            this.addUser(presenceMessage)
        })

        this.channel.presence.subscribe('leave', (presenceMessage => {
            this.removeUser(presenceMessage)
        }))
    }

    joinLobbyPresence = async (): Promise<void> => {
        // TODO confirm that myself creates a "present" message which i also see
        await this.channel.presence.enter()
        // await this.fetchPresence()
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
        // TODO confirm i also get 'leave' message, so ill update.
        await this.channel.presence.leave()
    }

    // private fetchPresence = async () => {
    //     await this.channel.presence.get()
    //     this.connectedClients.clear()
    //     const presenceMessages = await this.channel.presence.get()
    //     presenceMessages.forEach((presenceMessage) => {
    //         const clientId = presenceMessage.clientId
    //         const {username} = presenceMessage.data
    //         this.connectedClients.set(clientId, {username, clientId})
    //     })
    //     this.setCallState({
    //         connection: "connected",
    //         currentUsers: this.connectedClients
    //     })
    // }

    async exitRoom(): Promise<void> {
        await this.channel.detach()
        this.setCallState({
            connection: "disconnected",
            currentUsers: new Map()
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

    private updatePresence = async (username: string) => {
        const presenceUpdate: PresenceData = {
            username
        }
        await this.channel.presence.update(presenceUpdate)
    }

    private addUser(presenceMessage: Types.PresenceMessage) {
        const clientId = presenceMessage.clientId
        const {username} = presenceMessage.data

        this.connectedClients.set(clientId, {username, clientId})
        this.setCallState({
            connection: "connected",
            currentUsers: this.connectedClients
        })
    }

    private removeUser(presenceMessage: Types.PresenceMessage) {
        this.connectedClients.delete(presenceMessage.clientId)
        this.removeRemoteUser(presenceMessage.clientId)

        // TODO confirm if i can set connection: connected or not
        this.setCallState({
            connection: "connected",
            currentUsers: this.connectedClients
        })
    }
}