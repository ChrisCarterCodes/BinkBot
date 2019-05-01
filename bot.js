const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const tmi = require('tmi.js');
const TmiContext = require('./tmicontext.js');

const config = require('./config/config');
const sqlite = require('sqlite');
const dbPromise = sqlite.open('betBot', { Promise });
const SQL = require('./config/sql');
let db;
let client;
let gtBetMode = false;
let bets = {};
let winners = [];

//initalize the database
~async function () {
  db = await dbPromise
  db.run(SQL.createUserVotesTable);
  //db.run("drop table userinfo");
  db.run(SQL.createUserInfoTable);

  // Define configuration options
  const opts = {
    connection: {
      reconnect: true // This
    },
    identity: {
      username: config.Bot.username,
      password: config.Bot.token
    },
    channels: config.Bot.channels
  };
  console.log(opts);

  // Create a client with our options
  client = new tmi.client(opts);


  // Register our event handlers (defined below)
  client.on('message', onMessageHandler);
  client.on('connected', onConnectedHandler);
  client.on('subscription', onSubHandler);
  client.on('resub', onSubResubHandler);
  client.on('subgift', onSubGiftHandler);
  client.on('join', onJoinHandler);
  client.on('error', onErrorHandler);

  // Connect to Twitch:
  client.connect();

  return true;
}()

const categories = ["enemizer", "boss shuffle", "retro", "keysanity", "inverted", "basic",
  "standard", "open",
  "kill pig", "all dungeons",
  "assured", "random weapon", "swordless",
  "normal", "hard"];

function gtBets(context, target, action, modFlag) {
  const user = context.username;
  if (action == 'open' && !gtBetMode && modFlag) {
    //enable bets
    gtBetMode = true;
    //reset leftover bets
    bets = {};
    //reset the last winners
    winners = [];
    client.say(target, `Get your bets in! type '!bet <number>' to place your bets for the GT chest!`);
  }
  else if (action == 'close' && gtBetMode && modFlag) {
    gtBetMode = false;
    client.say(target, `Bets are closed! Best of luck everyone!`);
  }
  else if (!isNaN(action)) {
    if (!gtBetMode) {
      client.say(target, `You either missed the betting, or we're not headed to GT. Or you're bored.`);
      return;
    }
    if (action <= 22 && action >= 1) {
      bets[user] = action;
    }
    else {
      client.say(target, `There's 22 checks in GT, buddy.`);
    }
  }
}

function gtWinner(target, context, action) {
  if (winners.length > 0) {
    client.say(target, `The winners have already been determined, they were ${winners.join(" , ")}`);
    return;
  }
  if (!gtBetMode) {
    if (action <= 22 && action >= 1) {
      for (user in bets) {
        if (bets[user] == action) { winners.push(user); incrementUserVotes(user, target); }
      }
      if (winners.length == 0) { winners = ['no one :c'] }
      client.say(target, `The winning chest was ${action}! Congratulations to ${winners.join(" , ")}`);
    }
    else {
      client.say(target, `There's 22 checks in GT, buddy.`);
    }
  }
}

// Called every time a message comes in
async function onMessageHandler(target, context, msg, self, data) {
/*   console.log(msg);
  console.log(self);
  console.log(context);
  console.log(data); */

  if (self) { return; } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim();
  const commandParts = commandName.split(" ");

  let tmiContext = TmiContext.parse(context);

  let outputText = '' // initialize in case we use
  const cmd = commandParts[0].toLowerCase()

  if (cmd[0] !== '!') return // we don't have a command, don't process

  switch (cmd) {
    case '!bet':
      if (commandParts.length > 1) {
        gtBets(context, target, commandParts[1], tmiContext.isMod);
      }
      else {
        client.say(target, `Place your bets on GT! Just enter '!bet <number>' to bet!`);
      }
      break;
    case '!betwinner':
      if (commandParts.length > 1 && tmiContext.isMod) {
        gtWinner(target, context, commandParts[1]);
      }
      break;
    case '!betstatus':
      outputText = JSON.stringify(bets, null, 1);
      outputText = outputText.replace(/("{|}")/gi, '"');
      client.say(target, `Current bets: ${outputText}`);
      break;
    case '!wheeladd':
      if (commandParts.length > 1) {
        updateWheel(tmiContext.username, msg, target);
      }
      break;
    case '!wheeloptions':
      client.say(target, `Valid categories: ${categories.join(" , ")}`);
      break;
    case '!wheelweight':
      printWheel(target);
      break;
    case '!wheelvotes':
    let votes= await getVoteCount(tmiContext.username, target)
      client.say(target, `@${tmiContext.username}, you have ${ votes } vote${votes!=1 ? "s":""} for the wheel.`);
      break;
    case '!wheelclear':
      if (commandParts.length > 1 && tmiContext.isMod) {
        clearWheel(commandParts[1], target);
      }
      break;
    case '!adduservote':
      if (commandParts.length > 1 && tmiContext.isMod) {
        incrementUserVotes(commandParts[1], target);
      }
      break;
    default:
      console.warn('unknown command: %s', cmd)
      break;
  }
}

function onSubHandler(channel, username, method, message, userstate) {
  onSubResubHandler(channel, username, 1, message, userstate, method)
}

function onSubGiftHandler(channel, username, streakMonths, recipient, method, userstate){
  onSubResubHandler(channel, recipient, 1, null, userstate, method)
}

function onSubResubHandler(channel, username, months, message, userstate, methods) {
  incrementUserVotes(username, channel);
  updateWheel(username, message, channel);
}

function onJoinHandler(channel, username, self) {
  if (self) {
    console.log('Bot joined channel: %s %s %s', channel, username, self);
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

function onErrorHandler(e) {
  console.error(e)
  throw new Error('CRITICAL ERROR: ' + e.message);
}

async function updateWheel(user, message, target) {
  if (!message) { return;  }
  message = message.toLowerCase();

  let votedCategory = "Invalid";
  let votes = await getVoteCount(user, target);
  if (votes <=0){
    client.say(target , `Sorry @${user}, but you don't currently have any available votes.`)
  }
  categories.forEach(category =>{
    category.split(/\s+/).forEach(word => {  
      if (message.indexOf(word) != -1) {
        //console.log(`Got one: ${categories[i]}`);
        votedCategory = category;
        if (votes > 0) {
          addVote(user, votedCategory, target);
        }
      }
    });
  });
  if (votedCategory == "Invalid") {
    if (message.includes('!wheeladd')) {
      client.say(target, `You didn't request a valid variation to put weight into! Type !wheeloptions for more info.`);
      return;
    }
  }
}

async function printWheel(channel) {
  channel=channel.replace(/^\#/, '');
  const result= await db.all(SQL.categoryCounts, [channel]);
  let finalString= "Current votes: "
  result.forEach(row => {
    finalString += `${row.categoryName} : ${row.counts}      `;
  });
  if(finalString === "Current votes: "){finalString+="none! :C"}
  client.say(channel, `${finalString}`);
}

function clearWheel(targetCategory, channel) {
  channel=channel.replace(/^\#/, '');
  db.run(SQL.deleteUserVotes, [channel, `%${targetCategory}%`]);
}



function incrementUserVotes(user, channel) {
  channel=channel.replace(/^\#/, '');
  db.run(SQL.incrementUserVote, [channel, user])
  db.all(SQL.getUserInfo, [channel]).then(function(result){
    console.log(result);
  }).catch(function(error) {
    console.log(error);
  });
}

function decrementUserVotes(user, channel) {
  channel=channel.replace(/^\#/, '');
  db.run(SQL.decrementUserVote, [channel, user]);
  db.all(SQL.getUserInfo, [channel]).then(function(result){
    console.log(result);
  }).catch(function(error) {
    console.log(error);
  });
}

async function addVote(user, votedCategory, channel) {
  channel=channel.replace(/^\#/, '');
  db.run(SQL.addVote, [channel, user, votedCategory]).then(
    decrementUserVotes(user, channel)).then(
   client.say(channel, `@${user}, your vote for ${votedCategory} was recorded.`)
  );
  db.all(SQL.allUserVotes, [channel]).then(function(result){
    console.log(result);
  }).catch(function(error) {
    console.log(error);
  })
}

async function getVoteCount(user, channel) {
  channel=channel.replace(/^\#/, '');
  const result= await db.all(SQL.getVoteCount, [channel, user])
  if(result[0]){return result[0].count}
  else{return 0}
}