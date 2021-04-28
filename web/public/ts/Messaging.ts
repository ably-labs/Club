import Ably, {Realtime} from 'ably/promises'

export default class Messaging {
    client: Realtime

    constructor() {
        if (!process.env.NEXT_PUBLIC_ABLY_API_KEY) {
            console.warn(`API key is missing, it is ${process.env.NEXT_PUBLIC_ABLY_API_KEY}.`)
        }
        const options: Ably.Types.ClientOptions = {
            key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
        }
        this.client = new Realtime(options)
        console.log(typeof(this.client))
    }

    async initialize() {

    }
}