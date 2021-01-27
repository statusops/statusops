# StatusOps

TBD

## Install

### Requirements

- NodeJS `>=15.6.0`
- Redis server `>=5.0.5`

### Configuration

Configuration is done via environment variables:

- MESSAGING_WEBHOOK: http endpoint where to post updates when available.
- REDIS_URL: it defaults to `redis://localhost:6379`
- LOG_LEVEL: it defaults to `info`

Optional (only used for debugging):

- DANGER_NO_CACHE: this will allow to post updates multiple times
- INGEST_ALL_HISTORY: force providers to collect all incidents from the past

### Run periodic ingestions

```
node main.js
```

### Deployment guides

TBD

## Development

### Requirements

- NodeJS `>=15.6.0`
- Redis `>=5.0.5`. If you have `docker` + `docker-compose` you want need to install Redis on your machine.

### Setup

In a shell start your Redis server as follows.

```
docker-compose up -d
```

### Test

```
npm test
```

Run in watch mode with `inotifywait`:

```
while inotifywait -qqre modify './'; do clear; npm test; done
```


### Lint

```
npm run lint
```

Or with auto-fix:

```
npm run lint:fix
```

## Contribute

TBD

## License

TBD
