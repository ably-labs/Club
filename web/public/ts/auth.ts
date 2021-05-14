import {Types} from "ably";
import {ClientId} from "./models/ClientId";

const CLUB2D_API_URL = process.env.NEXT_PUBLIC_CLUB2D_API_URL

export const createAuthCallback = (clientId: ClientId) => {
    return async (data: Types.TokenParams,
                  callback: (error: Types.ErrorInfo | string,
                             tokenRequestOrDetails: Types.TokenDetails | Types.TokenRequest | string) => void)
        : Promise<void> => {
        try {
            const newTokenRequest = await requestTokenRequest(clientId)
            // below might not be necessary, ably will do it
            // const tokenDetails: Types.TokenDetails = await this.ablyClient
            // .auth.requestToken({clientId: data.clientId}, newTokenRequest)
            callback(null, newTokenRequest)
        } catch (e) {
            callback(e, null)
        }
    }
}

export const requestTokenRequest = async (clientId: string): Promise<Types.TokenRequest> => {
    const queryParams = new URLSearchParams([["clientId", clientId]]).toString()
    if (!CLUB2D_API_URL) {
        console.error(`CLUB2D_API_URL is ${CLUB2D_API_URL}, it needs to be specified as an environment variable.`)
    }
    const request = `${CLUB2D_API_URL}/createToken?` + queryParams
    try {
        const response = await fetch(request, {
            method: "post",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        if (response.status === 200) {
            return await response.json()
        } else {
            console.error(`Failed to make request: ${request}, got ${response.status}, ${response.body}.`)
        }
    } catch (e) {
        console.error(`Failed to make request: ${request}, failed with ${e}.`)
    }
}