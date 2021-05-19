import * as Ably from "ably/promises";
import * as functions from "firebase-functions";

/**
 * Authentication class used to create token requests through Ably. These token requests
 * can be used to generate tokens, which are used by clients.
 * @private
 */
class Auth {
  private ablyRestAPI: Ably.Rest;
  private ablyApiKey = (() => {
    if (process.env.IS_FIREBASE_CLI) {
      return functions.config().staging.ably.api_key;
    } else {
      return functions.config().ably.api_key;
    }
  })();

  constructor() {
    if (!this.ablyApiKey) {
      throw new Error(
          `api key is ${this.ablyApiKey}. Set it to a valid API key from ably.com/accounts`
      );
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
  createTokenRequest = async (
      clientId: string
  ): Promise<Ably.Types.TokenRequest> => {
    const tokenParams: Ably.Types.TokenParams = {
      clientId,
      capability: {
        "rooms:lobby": ["presence", "subscribe", "publish"],
      },
    };
    return await this.ablyRestAPI.auth.createTokenRequest(tokenParams);
  };
}

export default Auth;
