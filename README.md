# track-changes

## Why was this project created

I created `track-changes` to track updates in some websites and receive e-mail
notifications when these changes happen.

## How do I use it

The core service is a REST API with endpoints to create, list and delete
the URLs that are being track and a RPC Endpoint that triggers the tracking
process.

## How does this work under the hood

The tracking process requests a `GET` to the URL, retrieves its previous version
from AWS S3, converts both to Markdown, runs a `diff` between the old version
and the new one and, if any change is found, it sends a e-mail to the recorded
addresses.

## Set-up and start

First of all, clone this repo.

After that, from the directory you clone, run this to install all dependencies:

```
npm i
```

This repo has a file named `config.example.json` which contains the example
which the configuration file must follow.

The `server.js` file verifies if there is a env `TRACK_CHANGES_CONFIG` and, if
it exists, it tries to parse it to JSON. If the env isn't set, it searches the
`config.json` file in the projects root directory.

To start the package you will need a MongoDB, a S3 bucket and a Sendgrid API
key.

After setting everything up, you must run:

```shell
npm start
```

## Managing trackings

The REST API to manage tracking answers in the URI `/track/:id` and you request
it using `GET`, `POST` and `DELETE`.

### Listing all trackings

To see all trackings, request a `GET` to `/track`. Simple like that:

```shell
curl http://localhost:3000/track
```

### Create a new tracking

In order to create a new track you should request a `POST` to `/track` sending
a JSON in the body with two properties: `url` and `email`.

If the URL is already being tracked, the service will add the e-mail to the list
of notifiable e-mails for that URL.

Example:

```shell
curl -XPOST -H'Content-type: application/json' http://localhost:3000/track -d'{
  "url": "http://github.com",
  "email": "user@server.tld"
}'
```

### Delete a tracking

Simple as creating and listing all trackings, to delete you must request a
`DELETE` to `/track/:id` sending the ID as a URL parameter, just like this:

```shell
curl -XDELETE http://localhost:3000/track/:id
```

### Processing trackings

Instead of integrating some kind of scheduling in this project, I created a
endpoint that start the process to process the differences among the URLs.

You can request this endpoint in `/track-changes` with a `POST`, just like this:

```shell
curl -XPOST http://localhost:3000/track-changes
```

You can set it up in a `crontab` somewhere with the frequency you see fit.

## Contributing

You know, send a PR. :)

## Doubts

If I can help you in any way, I will. Contact me at
[eduardo@quagliato.me](mailto:eduardo@quagliato.me)
