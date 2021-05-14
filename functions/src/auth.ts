import * as Ably from "ably/promises";
import * as functions from "firebase-functions";

/**
* A
* @private
*/
class Auth {
    private ablyRestAPI: Ably.Rest
    private ablyApiKey = (() => {
      if (process.env.IS_FIREBASE_CLI) {
        return functions.config().staging.ably.api_key;
      } else {
        return functions.config().ably.api_key;
      }
    })()
    /**
     * Constructor
     */
    constructor() {
      if (!this.ablyApiKey) {
        throw new Error(`api key is ${(this.ablyApiKey)}, it needs to be set. Get it from ably.com/accounts`);
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
