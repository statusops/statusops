# StatusOps

StatusOps is an open-source (GPLv3) service that makes it easy to integrate third-party incident updates with other workflows.

- **Standard interface**: services such as Gitlab, Github, AWS or Google Cloud have different ways of posting status updates. StatusOps offers a standard interface.
- **Ready to use**: there's already [hundreds of services available](https://gitlab.com/statusops/statusops/-/packages/1101031). Contribute to have even more!
- **Easy integration**: updates can be posted via a HTTP webhook or directly to Slack.
- **Written in NodeJS**: its great I/O makes status checks a breeze.

## Install

### Requirements

- NodeJS `>=15.6.0`
- Redis server `>=5.0.5`

*Note: the project includes a Procfile to deploy to Heroku*

### Configuration

Configuration is done via the following environment variables.

- `SERVICES`: include a list of service keys separated by a comma. Example: `gitlab,github,s3_eu_west_3,google_cloud_bigtable`. You can check the services supported [here](https://gitlab.com/statusops/statusops/-/packages/1101031).
- `MESSAGING_HTTP_WEBHOOK`: this should be an url. Each time an update is registered it will be posted in JSON format. Here's an example:
    ```json
    {
    "serviceName": "Cloud Acme",
    "serviceKey": "cloud-acme",
    "title": "DNS issues",
    "description": "Something is going wrong on our side.",
    "link": "https://example.org/incident/url/with/all/details",
    "status": "active",
    "date": "2010-09-23T10:10:10.000Z",
    "incidentReference": "12E5MxYsASa"
    }
    ```
- `MESSAGING_SLACK_WEBHOOK`: details can be found [here](https://slack.com/intl/en-gb/help/articles/115005265063-Incoming-webhooks-for-Slack)
- `REDIS_URL`: it defaults to `redis://localhost:6379`
- `LOG_LEVEL`: it defaults to `info`

### Start service

```
node main.js
```

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

### Debugging

You can pass any of the following env variables as `true`:

- `DANGER_NO_CACHE`: this will allow to post updates multiple times. Defaults to `false`.
- `INGEST_ALL_HISTORY`: force providers to collect all incidents from the past. Defaults to `false`.


## Contribute

When contributing to this repository, please first discuss the change you wish to make via issue.

There are many ways you can contribute to StatusOps:

- Register a new service to an existing status provider (examples: [Status.io](src/providers/statusio.yml), [Statuspage](src/providers/statuspage.yml)).
- Implement a new provider. Please first check for open issues or create a new one to discuss the change you wish to make.
- Report bug.
- Suggest new features via a new issue.

## License

This project is licensed under the GNU General Public License v3.0.
