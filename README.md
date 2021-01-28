# StatusOps

StatusOps is an open-source service that makes it easy to integrate third-party incident status updates with other workflows.

- **Standard interface**: services such as Gitlab, Github, AWS or Google Cloud have different ways of posting status updates. StatusOps offers a standard interface.
- **Ready to use**: there's already >300 services available. Help contributing to have even more!
- **Easy integration**: updates can be posted via a HTTP webhook or directly to Slack.
- **Written in NodeJS**: its great I/O makes status checks a breeze.

## Install

### Requirements

- NodeJS `>=15.6.0`
- Redis server `>=5.0.5`

### Configuration

Configuration is done via environment variables.

#### Required

- `REDIS_URL`: it defaults to `redis://localhost:6379`

#### Messaging

In order to receive status updates you need to define at least one of the following env variables:


- `MESSAGING_HTTP_WEBHOOK`: the following JSON data will be sent via a POST.
- `MESSAGING_SLACK_WEBHOOK`: details can be found [here](https://slack.com/intl/en-gb/help/articles/115005265063-Incoming-webhooks-for-Slack)

#### Other

- `LOG_LEVEL`: it defaults to `info`

#### Debugging

- `DANGER_NO_CACHE`: this will allow to post updates multiple times
- `INGEST_ALL_HISTORY`: force providers to collect all incidents from the past

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
