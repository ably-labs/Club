# Firebase functions

## Running locally

- `cd functions`
- `npm install -g firebase-tools`
- Ensure you have the right project settings (ask to be added to the project, or create your own project)
- `firebase login`
- `npm i` to install dependencies
- `firebase functions:config:set ably.api_key=PUT_YOUR_API_KEY_HERE`

## Updating the API keys for the cloud functions

Create an account on Ably and get your API keys. I have 2 environments . You need to save them to the "function environment", by running:

- `firebase functions:config:set staging.ably.api_key=PUT_YOUR_API_KEY_HERE`
- `firebase functions:config:set production.ably.api_key=PUT_YOUR_API_KEY_HERE`
- To run the functions locally, you need to also generate the local `.runtimeconfig.json`, by running `firebase functions:config:get > .runtimeconfig.json`
