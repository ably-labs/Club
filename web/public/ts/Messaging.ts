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

    constructor(username: string, setCallState: (value: (((prevState: CallState) => CallState) | CallState)) => void) {
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
        this.ablyClient.close()
        this.connect(username)
        // TODO is there an easier way to change the clientId?
        // this.ablyClient.clientId = username
    }

    joinRoom = async (): Promise<void> => {
        const channelOptions: Types.ChannelOptions = {
            params: {
                rewind: "0",
            }
        }
        this.channel = this.ablyClient.channels.get(this.CHANNEL_ID, channelOptions)

        const presenceListPromise = this.channel.presence.get()

        // await Promise.all([
        //     this.channel.presence.enter(),
        //     presenceListPromise
        // ])
        // const presenceMessages = await presenceListPromise
        try {
            await this.channel.presence.enter()
            const presenceMessages = await this.channel.presence.get() // aka members
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
        } catch (e) {
            console.warn(e)
        }
    }

    async exitRoom(): Promise<void> {
        this.ablyClient.close()
        this.setCallState({
            connection: "disconnected",
            currentUsers: []
        })
    }
}