const path = require('path');
require('dotenv').config({path: path.join(__dirname, '.env')});

const tmi = require('tmi.js');
const config = require('./config/config');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.cached.Database('weights');
const SQL = require('./config/sql');
const log = require('./lib/util/Logger');

log.debug(JSON.stringify(config));

const categories= [ "enemizer", "boss shuffle", "retro", "keysanity", "inverted", "basic",
                      "standard", "open",
                      "kill pig", "all dungeons", 
                      "assured", "random weapon", "swordless",
                      "normal", "hard" ];

//Define base db tables
db.serialize(function() {
  db.run(SQL.createUserVotesTable);
});
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
const client = new tmi.client(opts);
let gtBetMode= false;
let bets= {};
let winners=[];

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('subscription', onSubHandler);
client.on('resub', onSubResubHandler);
client.on('join', onJoinHandler);
client.on('error', onErrorHandler);

// Connect to Twitch:
client.connect();

// process end event listener
function killHandler(){
  log.info('killing connections');
  client.disconnect();
  log.info('exiting');
  process.exit(0);
}

process.on('SIGINT', killHandler);
process.on('SIGTERM', killHandler);

function gtBets(context, target, action, modFlag){
  log.debug('gtBets called: %s %s %s %s', JSON.stringify(context), target, action, modFlag)
  const user=context.username;
    if(action == 'open' && !gtBetMode && modFlag){
      //enable bets
      gtBetMode=true;
      //reset leftover bets
      bets={};
      //reset the last winners
      winners=[];
      client.say(target, `Get your bets in! type '!bet <number>' to place your bets for the GT chest!`);
    }
    else if(action == 'close' && gtBetMode && modFlag){ 
      gtBetMode=false;
      client.say(target, `Bets are closed! Best of luck everyone!`);
    }
    else if(!isNaN(action)){
      if (!gtBetMode){
        client.say(target, `You either missed the betting, or we're not headed to GT. Or you're bored.`);
        return;
      }
      if(action <=22 && action>=1){
        bets[user] = action;
      }
      else{
        client.say(target, `There's 22 checks in GT, buddy.`);
      }
    }
    log.debug(JSON.stringify(bets));
}

function gtWinner(target, context, action){
  log.debug('gtWinner called: %s %s %s', target, JSON.stringify(context), action)
  log.debug(winners);
  if (winners.length>0){
      log.warn('winners were already determined: %s ', winners.join(" , "));
      client.say(target, `The winners have already been determined, they were ${winners.join(" , ")}`);
      return;
  }
  if(!gtBetMode){
    if(action <=22 && action>=1){
      for (const user in bets){
        if (bets[user] == action){winners.push(user)}
      }
      if(winners.length == 0){winners=['no one :c']}
      client.say(target, `The winning chest was ${action}! Congratulations to ${winners.join(" , ")}`);
      log.verbose('winning chest: %s. Winner: %s', action, winners.join(" , "))
    }
    else{
      client.say(target, `There's 22 checks in GT, buddy.`);
      log.warn('action exceeded 22')
    }
  }
}

// Called every time a message comes in
function onMessageHandler (target, context, msg, self, data) {

  if (self) { log.debug('ignoring message from self'); return; } // Ignore messages from the bot

  const username = context['display-name'];
  log.verbose('Message received: %s[%s]: %s', username, target, msg);
  log.debug('Message metadata: isSelf %s, context: %s, data: %s', self, JSON.stringify(context), JSON.stringify(data));

  // Remove whitespace from chat message
  const commandName = msg.trim();
  const commandParts= commandName.split(" ");

  // determine permission level
  const modFlag=isMod(context);

  let outputText = ''; // initialize in case we use
  const cmd = commandParts[0].toLowerCase();

  if(cmd[0] !== '!') return // we don't have a command, don't process

  log.debug('Parsing command: %s', cmd);
  switch (cmd) {
    case '!bet':
      log.debug('processing !bet command')
      if (commandParts.length > 1) {
        gtBets(context, target, commandParts[1], modFlag);
      }
      else {
        client.say(target, `Place your bets on GT! Just enter '!bet <number>' to bet!`);
      }
      break;
    case '!betwinner':
      log.debug('processing !betwinner command')
      if (commandParts.length > 1 && modFlag) {
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
      if (commandParts.length > 2 && isMod) {
        updateWheel(commandParts[1], msg, target);
      }
      break;
    case '!wheeloptions':
      log.debug('processing !wheeloptions command')
      client.say(target, `Valid categories: ${categories.join(" , ")}`);
      break;
    case '!wheelvotes':
      log.debug('processing !wheelvotes command')
      printWheel(target);
      break;
    case '!wheelclear':
      log.debug('processing !wheelclear command')
      if (commandParts.length > 1 && isMod) {
        clearWheel(commandParts[1]);
      }
      break;
    default:
      log.warn('unknown command: %s', cmd)
      break;
  }
}

function onSubHandler (channel, username, method, message, userstate) {
  onSubResubHandler(channel, username, 1 , message, userstate, method)
}

function onSubResubHandler (channel, username, months, message, userstate, methods) {
  updateWheel(username, message, channel);
}

function onJoinHandler(channel, username, self) {
  log.info('Bot joined channel: %s %s %s', channel, username, self);
  //client.say(channel, 'Kyuobot is online!');
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  log.info(`* Connected to ${addr}:${port}`);
}

function onErrorHandler(e){
  log.error(e)
  throw new Error('CRITICAL ERROR: ' + e.message);
}

function updateWheel (user, message, target){
  log.debug('updateWheel called: %s %s %s', user, message, target)
  if(!message){return;}
  message= message.toLowerCase();
  
  const length= categories.length;
  let votedCategory= "Invalid";
  let i
  for( i=0; i < length; i++){
    if (message.indexOf(categories[i])!=-1) {
      log.debug(`Got one: ${categories[i]}`);
      votedCategory= categories[i];
      break;
    }
  }
  if(votedCategory == "Invalid"){
    if(message.includes('!wheeladd')){
      client.say(target, `You didn't request a variation to put weight into! Type !wheel for more info.`);
    }
  }
  else{
    log.debug(votedCategory);
    const insertStmt= db.prepare(SQL.insertUserVote);
    insertStmt.run(user, votedCategory);
    insertStmt.finalize();
    const sql= SQL.allUserVotes;
    db.all(sql, [], (err, rows) => {
      if (err) {
        throw err;
      }
      rows.forEach((row) => {
        log.debug(row.categoryName+" : "+row.userName);
      });
    });
  }
}

function printWheel(target){
  log.debug('printWheel called: %s', target)
  const categories= { "Variation":{
                        "enemizer": {"count": 0, "users": null},
                        "boss shuffle": {"count": 0, "users": null},
                        "retro": {"count": 0, "users": null},
                        "keysanity": {"count": 0, "users": null},
                        "inverted": {"count": 0, "users": null},
                        "basic": {"count": 0, "users": null}
                      },
                      "State":{
                        "standard": {"count": 0, "users": null},
                        "open": {"count": 0, "users": null}
                      },
                      "Goal":{
                        "kill pig": {"count": 0, "users": null},
                        "all dungeons": {"count": 0, "users": null}
                      },
                      "Uncle":{ 
                        "assured": {"count": 0, "users": null},
                        "random weapon": {"count": 0, "users": null},
                        "swordless": {"count": 0, "users": null}
                      },
                      "Difficulty":{
                        "normal": {"count": 0, "users": null},
                        "hard": {"count": 0, "users": null} 
                      }
                    }
  const message= "Current Votes: "
  const sql= SQL.categoryCounts;
  const response= new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        throw err;
      }
      else{
        let finalString="";
        rows.forEach((row) => {
        categories[row.categoryName]=row.counts;
        categories[row.categoryName]=row.users;
        finalString += `${row.categoryName} : ${row.counts} (${row.users})      `;
        });
        resolve(finalString);
      }
    });
  });
  response.then((value) =>{
    if(value){
      client.say(target, `${value}`);
    }
    else{
      client.say(target, "No votes!");
    }
  });
}

function clearWheel(targetCategory){
  log.debug('clearWheel called: %s', targetCategory)
  const deleteStmt= db.prepare (SQL.deleteUserVotes);
  deleteStmt.run("%"+targetCategory+"%");
  deleteStmt.finalize();
}

function isMod(context){
  log.debug('isMod called: %s', JSON.stringify(context))
  if(context['badges']){
    if(context['user-type'] == "mod" || !context['badges']['broadcaster'] === null){
      return true;
    }
  }
}

function isSub(context){
  log.debug('isSub called: %s', JSON.stringify(context))
  if(context['badges']){
    if(context['badges']['subscriber'] ){
      return true;
    }
    return true;
  }
}

// healthcheck ping
var http = require('http');
http.createServer(function (req, res) {
  log.debug('healthcheck server pinged')
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello World!');
  res.end();
}).listen(process.env.PORT || 8080);

// keep alive function
http.get(`http://127.0.0.1:${process.env.PORT || 8080}`); //test
setInterval(function() { 
    http.get(`http://127.0.0.1:${process.env.PORT || 8080}`);
}, 300000);
