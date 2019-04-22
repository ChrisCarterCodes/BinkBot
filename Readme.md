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
* **!wheelvotes** - Shows current count of votes for each variation category. 
* **!wheeladd** <username> <choice> - Manually updates a user's wheel choice, usable in case they forget to add a category in their resub or type it wrong.
  * **!wheelclear** <choice> - Removes votes for a category after the wheel picks it.

All **bold** commands are restricted to moderator/host only commands

## Setup and Launch

To set the bot up, you'll need to create a new Twitch user to be the bot, including "bot" somehow in the name would be recommended. After creation, log in with the bot account and visit https://twitchapps.com/tmi/ . This will let you generate an oauth token for authentication with Twitch. Record this token, including the "oauth:" portion at the beginning.

In config/default.json, fill in the relevant fields:
*  "username": "<bot username>" - your bot username, be sure to include it inside the double quotes (")
* "password": "<oauth token here>" - Include the whole string, including the "oauth:"
* "channels": ["<channel bot should join>"] - channel(s) the bot should be in, this is usually the end of the link for your channel

There is an example config called example.json for how things should be formatted that you may use to inform your configuration.

Once the defaul.json is configured, you can either run via the command line with "npm install" folloed by "node bot.js" or use the provided startBot.bat file for Windows users. If your deafult.json is not configured properly, you will likely receive an error and the bot will terminate.
