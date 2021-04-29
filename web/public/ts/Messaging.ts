import Ably, {Realtime} from 'ably/promises'
import {Types} from "ably";

export default class Messaging {
    private readonly ablyClient: Realtime;
    private readonly CHANNEL_ID = "rooms:ben";
    private channel: Types.RealtimeChannelPromise | null = null

    constructor() {
        if (!process.env.NEXT_PUBLIC_ABLY_API_KEY) {
            console.warn(`API key is missing, it is ${process.env.NEXT_PUBLIC_ABLY_API_KEY}.`)
        }
        const options: Ably.Types.ClientOptions = {
            key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
        }
        this.ablyClient = new Realtime(options)
        console.log(typeof(this.ablyClient))

        this.ablyClient.connection.on('closed', () => {
            console.log("Disconnected from Ably.")
        })
    }

    // TODO display existing users

    async joinRoom(): Promise<String[]> {
        this.ablyClient.connect()
        const channelOptions: Types.ChannelOptions = {
            params: {
                rewind: "0",
            }
        }
        this.channel = this.ablyClient.channels.get(this.CHANNEL_ID, channelOptions)
        this.ablyClient.connection.on('connected', () => {
            console.log("Connected to Ably.")
        })

        // TODO get all users in channel
        return ["bob", "sam", "july"]
    }

    async exitRoom() {
        this.ablyClient.close()
    }
}