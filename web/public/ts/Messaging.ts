import {Realtime} from 'ably/promises'
import {Types} from "ably";
import UserMedia from "./models/UserMedia";
import FaceMessage from "./models/FaceMessage";
import {ClientId} from "./models/ClientId";
import {requestTokenRequest} from "./auth";
import {TailwindColor} from "./colors";

export type CallState = "connected" | "disconnected"
export type CurrentUsers = Map<ClientId, User>;

export type User = {
    clientId: string,
    username: string,
    color: TailwindColor
}

interface PresenceData {
    username: string,
    color: TailwindColor
}


/**
 * Involves all network code, for example, connecting to Ably, connecting to a channel,
 * joining the presence list of a channel, sending or receiving face data.
 *
 * Uses Ably to send data.
 */
export default class Messaging {
    private ablyClient: Realtime;
    private readonly CHANNEL_ID = "rooms:lobby";
    private channel: Types.RealtimeChannelPromise | null = null
    private readonly setCallState: (value: (((prevState: ("connected" | "disconnected")) => ("connected" | "disconnected")) | "connected" | "disconnected")) => void;
    private readonly setCurrentUsers: (value: (((prevState: User[]) => User[]) | User[])) => void;
    private connectedClients = new Map<ClientId, User>();
    private readonly clientId: string;
    private username: string;
    private updateRemoteFaceMeshs: (remoteUserMedia: UserMedia) => void
    private removeRemoteUserHandler: (clientId: ClientId) => void
    private color: TailwindColor;

    constructor(username: string,
                color: TailwindColor,
                setCallState: (value: (((prevState: ("connected" | "disconnected")) => ("connected" | "disconnected")) | "connected" | "disconnected")) => void,
                setCurrentUsers: (value: (((prevState: User[]) => User[]) | User[])) => void,
    ) {
        this.username = username
        this.color = color
        this.setCallState = setCallState
        this.setCurrentUsers = setCurrentUsers
    }

    connect = async (): Promise<void> => {
        try {
            this.ablyClient = new Realtime({
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

    setColor = (color: TailwindColor): void => {
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
            const faceMessage = FaceMessage.decodeFromFlatBuffer(message.data)
            // const faceMessage = FaceMessage.decode(message.data) // Using custom serializer
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
            this.updateRemoteUser(presenceMessage)
        })

        this.channel.presence.subscribe('present', (presenceMessage) => {
            this.updateRemoteUser(presenceMessage)
        })

        this.channel.presence.subscribe('update', (presenceMessage) => {
            this.updateRemoteUser(presenceMessage)
        })

        this.channel.presence.subscribe('leave', (presenceMessage => {
            this.removeRemoteUser(presenceMessage)
        }))
    }

    /**
     * Becomes present in the lobby, so other users can see the current user,
     * and associated details like username and color.
     */
    joinLobbyPresence = async (): Promise<void> => {
        const presenceData: PresenceData = {
            username: this.username,
            color: this.color
        }
        this.setCallState("connected");
        await this.channel.presence.enter(presenceData)
    }

    /**
     * Publishes the latest data state to the channel.
     * @param faceMeshCoordinates
     * @param faceMeshColor
     * @param meshPointSize
     * @param usernameAnchorCoordinates
     */
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
        // const uint8Array = faceMessage.encode()
        const uint8Array = faceMessage.encodeIntoFlatBuffer()
        await this.channel.publish("face", uint8Array)
    }

    leaveLobbyPresense = async (): Promise<void> => {
        await this.channel.presence.leave()
        this.connectedClients.delete(this.clientId)
        this.setCallState("disconnected");
        this.updateLocalUsernameList()
    }

    async disconnect(): Promise<void> {
        await this.channel.detach()
        this.updateLocalUsernameList()
        this.setCallState("disconnected");
    }

    close(): void {
        this.ablyClient.close()
    }

    /**
     *
     * @param removeRemoteUser
     */
    setRemoveRemoteUserHandler(removeRemoteUser: (clientId: string) => void): void {
        this.removeRemoteUserHandler = removeRemoteUser
    }

    /**
     * Update the presence data which other users see about the current user. Presence data is used for
     * infrequently changing data, such as face mesh point size and face color. Regular messages
     * should be used for more frequent data.
     */
    updatePresenceData = async (): Promise<void> => {
        const presenceData: PresenceData = {
            username: this.username,
            color: this.color
        }
        await this.channel.presence.update(presenceData)
    }

    private updateRemoteUser(presenceMessage: Types.PresenceMessage) {
        const clientId = presenceMessage.clientId
        const {username, color} = presenceMessage.data

        this.connectedClients.set(clientId, {username, clientId, color})
        if (this.clientId === clientId) {
            this.setCallState("connected")
        }
        this.updateLocalUsernameList()
    }

    private removeRemoteUser(presenceMessage: Types.PresenceMessage) {
        this.connectedClients.delete(presenceMessage.clientId)
        this.removeRemoteUserHandler(presenceMessage.clientId)
        this.updateLocalUsernameList()
    }

    private updateLocalUsernameList() {
        const users: User[] = []
        this.connectedClients.forEach((user) => {
            users.push(user);
        })
        this.setCurrentUsers(users)
    }
}