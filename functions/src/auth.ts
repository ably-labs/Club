import * as Ably from "ably/promises";
import * as functions from "firebase-functions";

/**
* A
* @private
*/
class Auth {
    private ablyRestAPI: Ably.Rest
    private ablyApiKey = functions.config().ably.api_key
    /**
     * Constructor
     */
    constructor() {
      if (!this.ablyApiKey) {
        throw new Error(`api key is ${(this.ablyApiKey)}`);
      }
      const clientOptions: Ably.Types.ClientOptions = {
        key: this.ablyApiKey,
      };
      this.ablyRestAPI = new Ably.Rest(clientOptions);
    }

    /**
     * Create token for specific client id.
     *
     * @param clientId Client ID of user for Ably.
     */
    createTokenRequest = async (clientId: string): Promise<Ably.Types.TokenRequest> => {
      const tokenParams: Ably.Types.TokenParams = {
        clientId,
      };
      return await this.ablyRestAPI.auth.createTokenRequest(tokenParams);
    }
}

export default Auth;
