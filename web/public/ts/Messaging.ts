import {Realtime} from 'ably/promises'
import {Types} from "ably";
import UserMedia from "./models/UserMedia";
import FaceMessage from "./models/FaceMessage";
import {ClientId} from "./models/ClientId";
import {requestTokenRequest} from "./auth";

export type ConnectionState = "connected" | "disconnected"

export type User = {
    clientId: string,
    username: string,
    color: string
}

interface PresenceData {
    username: string,
    color: string
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
    private color: string;

    constructor(username: string,
                color: string,
                setCallState: (value: (((prevState: CallState) => CallState) | CallState)) => void,
    ) {
        this.username = username
        this.color = color
        this.setCallState = setCallState
    }

    connect = async (): Promise<void> => {
        try {
            this.ablyClient = new Realtime({
                useTokenAuth: true,
                echoMessages: false,
                authCallback: async (data, callback) => {
                    try {
                        callback(null, await requestTokenRequest(data.clientId))
                    } catch (e) {
                        callback(e, null)
                    }
                }
            })

            this.channel = this.ablyClient.channels.get(this.CHANNEL_ID, {
                params: {
                    rewind: "0",
                }
            })

            if (this.channel) {
                this.setCallState({
                    connection: "connected",
                    currentUsers: new Map()
                })
            }

        } catch (e) {
            console.error(e)
            throw new Error("Failed to connect to Ably.")
        }
        this.addEventHandlers();
    }

    setUpdateRemoteFaceHandler(callback: (remoteUserMedias: UserMedia) => void): void {
        this.updateRemoteFaceMeshs = callback
    }

    setUsername = (username: string): void => {
        this.username = username
    }

    setColor = (color: string): void => {
        this.color = color
    }

    private addEventHandlers = () => {

        this.ablyClient.connection.on('connected', () => {
            console.log("Connected to Ably.")
        })

        this.ablyClient.connection.on('closed', () => {
            console.log("Disconnected from Ably.")
        });

        this.channel.subscribe("face", (message: Types.Message) => {
            const faceMessage = FaceMessage.decode(message.data)
            this.updateRemoteFaceMeshs({
                clientId: message.clientId,
                username: this.connectedClients.get(message.clientId).username,
                normalizedLandmarks1D: faceMessage.coordinates,
                faceMeshColor: faceMessage.color,
                meshPointSize: faceMessage.meshPointSize,
                usernameAnchorCoordinates: faceMessage.usernameAnchorCoordinates
            })
        })

        this.channel.presence.subscribe("enter", (presenceMessage) => {
            const {username} = presenceMessage.data
            console.log(`User entered: ${username} with id${presenceMessage.clientId}`)
            this.setUser(presenceMessage)
        })

        this.channel.presence.subscribe('present', (presenceMessage) => {
            this.setUser(presenceMessage)
        })

        this.channel.presence.subscribe('update', (presenceMessage) => {
            this.setUser(presenceMessage)
        })

        this.channel.presence.subscribe('leave', (presenceMessage => {
            this.removeUser(presenceMessage)
        }))
    }

    joinLobbyPresence = async (): Promise<void> => {
        const presenceMessage: PresenceData = {
            username: this.username,
            color: this.color
        }
        await this.channel.presence.enter(presenceMessage)
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
        this.connectedClients.delete(this.clientId)
    }

    async exitRoom(): Promise<void> {
        await this.channel.detach()
        this.setCallState({
            connection: "disconnected",
            currentUsers: new Map()
        })
    }

    close(): void {
        this.ablyClient.close()
    }

    /**
     *
     * @param removeRemoteUser
     */
    setRemoveRemoteUserHandler(removeRemoteUser: (clientId: string) => void): void {
        this.removeRemoteUser = removeRemoteUser
    }

    updatePresence = async (): Promise<void> => {
        const presenceUpdate: PresenceData = {
            username: this.username,
            color: this.color
        }
        await this.channel.presence.update(presenceUpdate)
    }

    private setUser(presenceMessage: Types.PresenceMessage) {
        const clientId = presenceMessage.clientId
        const {username, color} = presenceMessage.data

        this.connectedClients.set(clientId, {username, clientId, color})
        this.setCallState({
            connection: "connected",
            currentUsers: this.connectedClients
        })
    }

    private removeUser(presenceMessage: Types.PresenceMessage) {
        this.connectedClients.delete(presenceMessage.clientId)
        this.removeRemoteUser(presenceMessage.clientId)

        this.setCallState({
            connection: "connected",
            currentUsers: this.connectedClients
        })
    }
}