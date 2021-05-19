import { Types } from 'ably';

export const CLUB2D_API_URL = process.env.NEXT_PUBLIC_CLUB2D_API_URL;
const createTokenRequestUrl = `${CLUB2D_API_URL}/createTokenRequest`;

/**
 * Pass in the clientId if you already have one and want to renew it, otherwise the server will pass one in.
 * @param clientId
 */
export const requestTokenRequest = async (
  clientId?: string
): Promise<Types.TokenRequest> => {
  if (!CLUB2D_API_URL) {
    console.error(
      `CLUB2D_API_URL is ${CLUB2D_API_URL}, it needs to be specified as an environment variable.`
    );
  }
  let request = createTokenRequestUrl;
  if (clientId) {
    const queryParams = new URLSearchParams([
      ['clientId', clientId],
    ]).toString();
    request = createTokenRequestUrl + '?' + queryParams;
  }
  const response = await fetch(request, {
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  if (response.status === 200) {
    return await response.json();
  } else {
    console.error(
      `Failed to make request, got ${response.status}, ${response.body}.`
    );
  }
};
