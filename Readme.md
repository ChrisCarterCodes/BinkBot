# GT Tower Bot

Simple bot to keep track of GT bets during streams and track winners who guess correctly.

## Node install

This bot runs on top of Node.js. You can obtain the installation here: https://nodejs.org

You may need to restart after installing node for the bot to run.

At this time the bot was developed on top of Node v10.15.3

## Commands
### GT Bets
* **!bet open** - enables betting mode, wipes out previous winners and bets
* !bet \<number\> - set the user's bet. Additional calls will overwrite last bet.
* **!bet close** - closes betting mode. All bets are locked in.
* **!betwinner \<number\>** - Sets the winning number and determines who guessed right.
* **!betstatus** - Rough command, shows current bet object status, but not user friendly pretty output.

All \<number\> parameter commands are restricted to 1-21 for valid chest numbers

### Wheel Weight Tracker

The bot now adds a vote to a user every time a user subs, resubs, or is gifted a sub, as well as when they win the bet game.

* !wheelweight - Shows current count of votes for each variation category.
* !wheelvotes - Sends a message telling the user how many available votes they have
* !wheeladd <choice> - Users can use a vote to add a weight to the wheel. Doesn't let them if they have no votes.
* **!wheelclear** <choice> - Removes votes for a category after the wheel picks it.
* !wheeloptions - Shows valid wheel category options that can be in the wheeladd or sub messages
* **!adduservote <username> -  Lets mods manually add a single weight vote to a user if they earned one while the bot was offline or through other means.

All **bold** commands are restricted to moderator/host only commands

## Setup and Launch

To set the bot up, you'll need to create a new Twitch user to be the bot, including "bot" somehow in the name would be recommended. After creation, log in with the bot account and visit https://twitchapps.com/tmi/ . This will let you generate an oauth token for authentication with Twitch. Record this token, including the "oauth:" portion at the beginning.

create a file called .env in the base directory of the bot, and fill it out like so. If you prefer you can let the bot prompt you for these settings when you start it rather than creating the file:
```
[TWITCH]
TWITCH_USERNAME=<bot username> - your bot username
TWITCH_OAUTH_TOKEN= <oauth token here> - Include the whole string, including the "oauth:"
TWITCH_TARGET_CHANNELS=<channel bot should join>,[optional other channel it should join] - channel(s) the bot should be in, this is usually the end of the link for your channel
```

Once the .env is configured, you can either run via the command line with "npm install" followed by "node bot.js" or use the provided startup.ps1 file for Windows users or startup.sh for unix. If your .env is not configured properly, you will likely receive an error and the bot will terminate.
