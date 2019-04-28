module.exports = {
    "Bot": {
        "username": process.env.TWITCH_USERNAME,
        "token": process.env.TWITCH_OAUTH_TOKEN,
        "channels": process.env.TWITCH_TARGET_CHANNELS.split(',').filter((e) => e != '')
    }
}
