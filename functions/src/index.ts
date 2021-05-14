import * as functions from "firebase-functions";
import * as express from "express";
import Auth from "./auth";
import * as cors from "cors";
import {v4 as uuidv4} from "uuid";

const expressApp = express();

// FIXME cors issue
// const corsOptions: cors.CorsOptions = {
//   origin: ["http://localhost:8000",
//     "https://club2d.orth.uk",
//     "https://*.orth.uk"],
// };
expressApp.use(cors({
  origin: true,
  optionsSuccessStatus: 200,
}));
// expressApp.use(cors(corsOptions));
expressApp.use(express.json());

const auth = new Auth();

// export const createToken = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// expressApp.options("/createTokenRequest", (request, response) => {
//   return response.status(200).send();
// });

expressApp.post("/createTokenRequest", async (request, response) => {
  // functions.logger.info("Hello logs!", {structuredData: true});
  const clientId = uuidv4();
  const tokenRequest = await auth.createTokenRequest(clientId);
  response.send(JSON.stringify(tokenRequest));
});

export const app = functions
    .region("europe-west2")
    .https.onRequest(expressApp);
