# Club

A video calling app which shows a virtual character instead of your real face, so you can chat anonymously. You can also move around the environment in 2D.

Note: # The code in server directory is not being used at the moment, it will probably be deleted/ heavily modified when I work on adding audio support efficiently.

## Things learnt:

- Cloudflare related:
  - Cloudflare workers related:
    - Cloudflare workers runs as a **Service Worker**, not as a NodeJS application or a browser application. Some libraries don't support this very well, and so this limits the use of Cloudflare Workers. This is different to other serverless products, which run in NodeJS. The reason why Cloudflare uses Service Workers and not NodeJS is to run in V8 isolates for "scale, security and speed". See Kenton Varda's [talk](https://www.youtube.com/watch?v=HK04UxENH10) for more.
    - You need a DNS record pointing to the cloudflare worker route. i.e. If you want your worker to work at api.call.orth.uk, you need to explicitly set api.call.orth.uk to have a record. Erisa on the Cloudflare Workers discord suggested setting a `AAAA` record to `100::`, and that worked great.
    - Running `wrangler dev` might not give you any errors. You should first try to publish the worker using `wrangler publish`, fix the errors and confirm it works. Then `wrangler dev` will work.
  - Cloudflare's free TLS/SSL certs only cover the apex (orth.uk) and 1 subdomain (club2d.orth.uk). So `api.club2d.orth.uk` doesn't get a valid SSL cert. Thanks `The Freelancer ;)` on Discord again. So I solved this by using the default worker domain, i.e. `worker_name.your_worker_subdomain.workers.dev`, which doesn't have this problem.
  - Environment variables specified in `wrangler.toml` or the cloudflare website will be accessible as global variables, not through `process.env.VAR_NAME`, but just `VAR_NAME`. This is confusing, because if you're using typescript, you need to ignore the warning like so:
    ```js
        // @ts-ignore
        console.warn(`api key is ${ABLY_PRIVATE_API_KEY}`)
    ```
  - Top tip: Join the cloudflare discord to get for support from really helpful Cloudflare people.
- Whats the difference between a Service Worker and a Web Worker?
  - The difference lies their usage.
    - Web Worker: General work done off the main thread.
    - Service Worker: A special purpose runtime which is a proxy between the browser and the server. Service Workers have extra APIs for intercepting network requests. Because Cloudflare Workers intercept network requests that are incoming to a domain, they kind of fit the service worker model. 
  - Webpack uses the same target (`webworker`) for both of them
  - From client/ browser apps, you pass messages to it using `window.postMessage()`

## Discoveries:

- Machine learning: MediaPipe library has memory leak. Submitted and pending fix/ release
- Serialization: MessagePack is turning Float32's into Float64, taking up double the space with no benefit. Tried protobuf, but found a bug. Switching to flatbuffers.
