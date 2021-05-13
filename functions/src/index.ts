import * as functions from "firebase-functions";
import * as express from "express";
import Auth from "./auth";
import * as cors from "cors";

const expressApp = express();

// FIXME cors issue
// const corsOptions: cors.CorsOptions = {
//   origin: ["http://localhost:8000",
//     "https://club2d.orth.uk",
//     "https://*.orth.uk"],
// };
expressApp.use(cors());
// expressApp.use(cors(corsOptions));
expressApp.use(express.json());

const auth = new Auth();

// export const createToken = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// expressApp.options("createToken", cors());

expressApp.post("/createToken", async (request, response) => {
  // functions.logger.info("Hello logs!", {structuredData: true});
  const clientId = request.query.clientId as string;
  const tokenRequest = await auth.createTokenRequest(clientId);
  response.send(JSON.stringify(tokenRequest));
});

export const app = functions
    .region("europe-west2")
    .https.onRequest(expressApp);
