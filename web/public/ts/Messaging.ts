import Ably, {Realtime} from 'ably/promises'
import {Types} from "ably";

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

    constructor(username: string, setCallState: (value: (((prevState: CallState) => CallState) | CallState)) => void) {
        this.username = username
        this.setCallState = setCallState
        if (!process.env.NEXT_PUBLIC_ABLY_API_KEY) {
            console.error(`API key is missing, it is ${process.env.NEXT_PUBLIC_ABLY_API_KEY}.`)
        }
        this.connect(username)
    }

    connect = (username: string) => {
        const options: Ably.Types.ClientOptions = {
            key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
            clientId: username,
        }
        this.ablyClient = new Realtime(options)
        this.ablyClient.connection.on('connected', () => {
            console.log("Connected to Ably.")
        })

        this.ablyClient.connection.on('closed', () => {
            console.log("Disconnected from Ably.")
        });
    }

    setUsername = (username) => {
        this.username = username
        this.ablyClient.channels.get(this.CHANNEL_ID).detach()
        this.connect(username)
        // TODO is there an easier way to change the clientId?
        // this.ablyClient.clientId = username
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
        this.connectedClientIds = this.connectedClientIds.filter((value)=> value !== this.username)
        this.setCallState({
            connection: "connected",
            currentUsers: this.connectedClientIds
        })
    }

    leaveLobbyPresense = async () => {
        await this.channel.presence.leave()
        this.connectedClientIds = this.connectedClientIds.filter((value)=> value !== this.username)
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