# Club

A video calling app which shows a virtual character instead of your real face, so you can chat anonymously. You can also move around the environment in 2D.

Note: # The code in server directory is not being used at the moment, it will probably be deleted/ heavily modified when I work on adding audio support efficiently.

## Things learnt:

- Cloudflare related:
  - Cloudflare workers related:
    - You need a DNS record pointing to the cloudflare worker route. i.e. If you want your worker to work at api.call.orth.uk, you need to explicitly set api.call.orth.uk to have a record. Erisa on the Cloudflare Workers discord suggested setting a `AAAA` record to `100::`, and that worked great.
    - Running `wrangler dev` might not give you any errors. You should first try to publish the worker using `wrangler publish`, fix the errors and confirm it works. Then `wrangler dev` will work.
  - Cloudflare's free TLS/SSL certs only cover the apex (orth.uk) and 1 subdomain (club2d.orth.uk). So `api.club2d.orth.uk` doesn't get a valid SSL cert. Thanks `The Freelancer ;)` on Discord again. So I solved this by using the default worker domain, i.e. `worker_name.your_worker_subdomain.workers.dev`, which doesn't have this problem.
  - Top tip: Join the cloudflare discord to get for support from really helpful Cloudflare people.

## Discoveries:

- Machine learning: MediaPipe library has memory leak. Submitted and pending fix/ release
- Serialization: MessagePack is turning Float32's into Float64, taking up double the space with no benefit. Tried protobuf, but found a bug. Switching to flatbuffers.
