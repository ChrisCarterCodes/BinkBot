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
let categories = [];
const log = require('./lib/util/Logger');

log.debug(JSON.stringify(config));

//initalize the database
~async function () {
  db = await dbPromise
  db.run(SQL.createUserVotesTable);
  //db.run("drop table userinfo");
  db.run(SQL.createUserInfoTable);
  db.exec(SQL.createCategoriesTable);
  getCategories();
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
  log.debug(JSON.stringify(opts));

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

// process end event listener
function killHandler() {
  log.info('killing connections');
  client.disconnect();
  log.info('exiting');
  process.exit(0);
}

process.on('SIGINT', killHandler);
process.on('SIGTERM', killHandler);




function gtBets(context, target, action, modFlag) {
  log.debug('gtBets called: %s %s %s %s', JSON.stringify(context), target, action, modFlag)
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
      log.verbose('winning chest: %s. Winner: %s', action, winners.join(" , "))
    }
    else {
      client.say(target, `There's 22 checks in GT, buddy.`);
      log.warn('action exceeded 22')
    }
  }
}

// Called every time a message comes in
async function onMessageHandler(target, context, msg, self, data) {
  /*   console.log(msg);
    console.log(self);
    console.log(context);
    console.log(data); */

  if (self) { log.debug('ignoring message from self'); return; } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim();
  const commandParts = commandName.split(" ");

  let tmiContext = TmiContext.parse(context);

  log.verbose('Message received: %s[%s]: %s', tmiContext.username, target, msg);
  log.debug('Message metadata: isSelf %s, context: %s, data: %s', self, JSON.stringify(context), JSON.stringify(data));

  let outputText = ''; // initialize in case we use
  const cmd = commandParts[0].toLowerCase();

  if (cmd[0] !== '!') return // we don't have a command, don't process

  log.verbose('Parsing command: %s', cmd);
  log.debug('Full command parts: %s', commandParts);
  switch (cmd) {
    case '!bet':
      log.debug('processing !bet command')
      if (commandParts.length > 1) {
        gtBets(context, target, commandParts[1], tmiContext.isMod);
      }
      else {
        client.say(target, `Place your bets on GT! Just enter '!bet <number>' to bet!`);
      }
      break;
    case '!betwinner':
      log.debug('processing !betwinner command')
      if (commandParts.length > 1 && tmiContext.isMod) {
        gtWinner(target, context, commandParts[1]);
      }
      break;
    case '!betstatus':
      log.debug('processing !betstatus command')
      outputText = JSON.stringify(bets, null, 1);
      outputText = outputText.replace(/("{|}")/gi, '"');
      client.say(target, `Current bets: ${outputText}`);
      break;
    case '!wheeladd':
      log.debug('processing !wheeladd command')
      if (commandParts.length > 1) {
        updateWheel(tmiContext.username, msg, target);
      }
      break;
    case '!wheeladdfor':
      log.debug('processing !wheeladd command')
      if (commandParts.length > 2 && tmiContext.isMod) {
        updateWheel(commandParts[1], msg, target);
      }
      break;
    case '!wheeloptions':
      log.debug('processing !wheeloptions command')
      getCategories();
      client.say(target, `Valid categories: ${categories.join(" , ")}`);
      break;
    case '!wheelweight':
      log.debug('processing !wheelweight command')
      printWheel(target);
      break;
    case '!wheelweights':
        log.debug('processing !wheelweights command')
        printWheel(target);
        break;
    case '!wheelvotes':
      let votes = await getVoteCount(tmiContext.username, target)
      client.say(target, `@${tmiContext.username}, you have ${votes} vote${votes != 1 ? "s" : ""} for the wheel.`);
      break;
    case '!wheelclear':
      log.debug('processing !wheelclear command')
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
      log.warn('unknown command: %s', cmd)
      break;
  }
}

function onSubHandler(channel, username, method, message, userstate) {
  onSubResubHandler(channel, username, 1, message, userstate, method)
}

function onSubGiftHandler(channel, username, streakMonths, recipient, method, userstate) {
  onSubResubHandler(channel, recipient, 1, null, userstate, method)
}

async function onSubResubHandler(channel, username, months, message, userstate, methods) {
  await incrementUserVotes(username, channel);
  //updateWheel(username, message, channel);
}

function onJoinHandler(channel, username, self) {
  if (self) {
    log.info('Bot joined channel: %s %s %s', channel, username, self);
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  log.info(`* Connected to ${addr}:${port}`);
}

function onErrorHandler(e) {
  log.error(e)
  throw new Error('CRITICAL ERROR: ' + e.message);
}

async function updateWheel(user, message, target) {
  log.debug('updateWheel called: %s %s %s', user, message, target)
  getCategories();
  if (!message) { log.debug('updateWheel: no message'); return; }
  message = message.toLowerCase();

  let votedCategory = "Invalid";
  let votes = await getVoteCount(user, target);
  log.info(`Votes: ${user} : ${votes}`);
  if (votes <= 0 && user != "kyoudai_shojin") {
    client.say(target, `Sorry @${user}, but you don't currently have any available votes.`)
    return;
  }

  let maxMatchCount=0;
  for (category of categories){
    matchCount=0;
    for(word of category.toLowerCase().split(/\s+/)){
      if (message.indexOf(word.toLowerCase()) != -1) {
        log.debug(`Got one: ${category}`);
        matchCount++;
        if (matchCount>maxMatchCount){
          maxMatchCount = matchCount
          votedCategory = category;
        }
        else if (matchCount == maxMatchCount){
          //Currently a tie, let's mark it as such. if the next match pushes it higher it'll supercede
          //Otherwise we're gonna tell the user that we found two equal options so they need to be more specific
          votedCategory= "tie"
        }
      }
      log.debug(`checking: ${category}`);
    }
  }

  if (votedCategory == "Invalid") {
    if (message.includes('!wheeladd')) {
      client.say(target, `@${user} You didn't request a valid variation to put weight into! Type !wheeloptions for more info.`);
      return;
    }
  }
  else if( votedCategory == "tie"){
    if (message.includes('!wheeladd')) {
      client.say(target, `@${user} We found at least two categories that matched your request. Try being a bit more specific!`);
      return;
    }
  }
  else{
    //Add the vote
    if (votes > 0 || user == "kyoudai_shojin") {
      addVote(user, votedCategory, target);
      votes--;
    } 
  }
}

async function printWheel(channel) {
  channel = channel.replace(/^\#/, '');
  log.debug('printWheel called: %s', channel)
  const voteResult = await db.all(SQL.allUserVotes, channel);
  //console.log(voteResult);
  let currentGroup='';
  let finalString='';
  let modifier=1;
  for (row of voteResult){
    (row.categoryName == "Basic Bitch" || row.categoryName == "Advanced") ? modifier=5 : modifier=1;
    console.log(row)
    if (row.categoryGroup == currentGroup){
      finalString += `${row.categoryName} : ${row.count+modifier} |      `;
    }
    else{
      if(currentGroup !== ''){client.say(channel, finalString);}
      currentGroup=row.categoryGroup;
      finalString = `${currentGroup} ~ `
      finalString += `${row.categoryName} : ${row.count+modifier} |      `;
    }
  }
  client.say(channel, finalString);
  
}

function clearWheel(targetCategory, channel) {
  log.debug('clearWheel called: %s', targetCategory)
  channel = channel.replace(/^\#/, '');
  db.run(SQL.deleteUserVotes, [channel, `%${targetCategory}%`]);
}



async function incrementUserVotes(user, channel) {
  channel = channel.replace(/^\#/, '');
  user=user.toLowerCase();
  db.run(SQL.incrementUserVote, [channel, user])
  let result=await db.all(SQL.getUserInfo, [channel]);
  log.debug('incrementUserVotes:');
  //console.log(result);
}

async function decrementUserVotes(user, channel) {
  channel = channel.replace(/^\#/, '');
  user=user.toLowerCase();
  db.run(SQL.decrementUserVote, [channel, user]);
  let result= await db.all(SQL.getUserInfo, [channel]);
  log.debug('decrementUserVotes:');
  //console.log(result);
}

async function addVote(user, votedCategory, channel) {
  channel = channel.replace(/^\#/, '');
  user=user.toLowerCase()
  await db.run(SQL.addVote, [channel, user, votedCategory]);
  await decrementUserVotes(user, channel);
  client.say(channel, `@${user}, your vote for ${votedCategory} was recorded.`);
  let result=await db.all(SQL.allUserVotes, [channel])
  log.debug('decrementUserVotes:');
 //console.log(result);
}

async function getVoteCount(user, channel) {
  channel = channel.replace(/^\#/, '');
  user=user.toLowerCase(); 
  log.info(` info: ${channel} ${user}`);
  const result = await db.all(SQL.getVoteCount, [channel, user])
  console.log(result);
  if (result[0]) { return result[0].count }
  else { return 0 }
}

async function getCategories() {
  const result = await db.all(SQL.getCategories, [])
  console.log(result);
  categories = []
  for (row of result){
      categories.push(row.categoryName)
  }
  console.log(categories);
}

// healthcheck ping
var http = require('http');
http.createServer(function (req, res) {
  log.debug('healthcheck server pinged')
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('Hello World!');
  res.end();
}).listen(process.env.PORT || 8080);

// keep alive function
http.get(`http://127.0.0.1:${process.env.PORT || 8080}`); //test
setInterval(function () { 
  http.get(`http://127.0.0.1:${process.env.PORT || 8080}`);
}, 300000);

/* setInterval(function(){
  client.say('bencreighton',`!backseat`);
}, 60000);
 */
