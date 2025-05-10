





Things to include: 
Explain how to get mastodon credentials and what type (user credentials)


## API Credentials (include in the frontend)

1. Mastodon: login to your mastodon account -> settings -> development -> create the name of your app, set link to github repo for now for website, set uri (http://localhost:5173/callback for local http://app-url/callback), and define scope (only choose "read" as it is top level permission, then you don't need to pass anything to authorization request). We first use only client id to get authorization code, and then use secret - so it is safe - both of these are safe as they are not stored - we only store token