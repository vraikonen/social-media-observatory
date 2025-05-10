# Mastodon Crawler

This is a Dockerized Mastodon crawler service that fetches public toots from Mastodon instances and stores them in MongoDB.

## Environment Variables

The following environment variables need to be set:

### MongoDB Configuration
- `MONGO_URI`: MongoDB connection string (default: mongodb://mongodb:27017/)
- `DB_NAME`: Database name (default: social_media)
- `COLLECTION_NAME`: Collection name for storing toots (default: mastodon_data)

### Mastodon Configuration
- `MASTODON_API_URL`: The Mastodon instance URL (e.g., https://mastodon.social)
- `MASTODON_USER_EMAIL`: Your Mastodon account email
- `MASTODON_USER_PASS`: Your Mastodon account password

### Optional
- `RUN_ID`: A unique identifier for this crawl run (default: auto-generated timestamp)

## Building and Running

1. Build the Docker image:
```bash
docker build -t mastodon-crawler .
```

2. Run the container:
```bash
docker run -d \
  --name mastodon-crawler \
  --network social-media-network \
  -e MONGO_URI=mongodb://mongodb:27017/ \
  -e DB_NAME=social_media \
  -e COLLECTION_NAME=mastodon_data \
  -e MASTODON_API_URL=https://mastodon.social \
  -e MASTODON_USER_EMAIL=your-email@example.com \
  -e MASTODON_USER_PASS=your-password \
  mastodon-crawler
```

## Features

- Fetches public toots from Mastodon instances
- Stores toots in MongoDB with run ID and timestamp
- Handles rate limiting with retries
- Supports pagination to fetch all available toots
- Dockerized for easy deployment

## Logging

Logs are output to stdout and can be viewed using:
```bash
docker logs mastodon-crawler
``` 