module.exports = {
    "Bot": {
        "username": process.env.TWITCH_USERNAME,
        "password": process.env.TWITCH_PASSWORD,
        "channels": process.env.TWITCH_TARGET_CHANNELS.split(',')
    }
}
