const path = require('path');
require('dotenv').config({path: path.join(__dirname, '.env')});

const tmi = require('tmi.js');
const config = require('./config/config');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.cached.Database('weights');
const SQL = require('./config/sql');

console.log(config);

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
    username: config['Bot.username'],
    password: config['Bot.token']
  },
  channels: config['Bot.channels']
};

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

function gtBets(context, target, action, modFlag){
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
    console.log(bets);
}

function gtWinner(target, context, action){
  console.log(winners);
  if (winners.length>0){
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
    }
    else{
      client.say(target, `There's 22 checks in GT, buddy.`);
    }
  }
}

// Called every time a message comes in
function onMessageHandler (target, context, msg, self, data) {
  console.log(msg);
  console.log(self);
  console.log(context);
  console.log(data); 
  
  if (self) { return; } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim();
  const commandParts= commandName.split(" ");

  // determine permission level
  const modFlag=isMod(context);

  let outputText = '' // initialize in case we use
  const cmd = commandParts[0].toLowerCase()

  if(cmd[0] !== '!') return // we don't have a command, don't process

  switch (cmd) {
    case '!bet':
      if (commandParts.length > 1) {
        gtBets(context, target, commandParts[1], modFlag);
      }
      else {
        client.say(target, `Place your bets on GT! Just enter '!bet <number>' to bet!`);
      }
      break;
    case '!betwinner':
      if (commandParts.length > 1 && modFlag) {
        gtWinner(target, context, commandParts[1]);
      }
      break;
    case '!betstatus':
      outputText = JSON.stringify(bets, null, 1);
      outputText = outputText.replace(/("{|}")/gi, '"');
      client.say(target, `Current bets: ${outputText}`);
      break;
    case '!wheeladd':
      if (commandParts.length > 2 && isMod) {
        updateWheel(commandParts[1], msg, target);
      }
      break;
    case '!wheeloptions':
      client.say(target, `Valid categories: ${categories.join(" , ")}`);
      break;
    case '!wheelvotes':
      printWheel(target);
      break;
    case '!wheelclear':
      if (commandParts.length > 1 && isMod) {
        clearWheel(commandParts[1]);
      }
      break;
    default:
      console.warn('unknown command: %s', cmd)
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
  console.log('Bot joined channel: %s %s %s', channel, username, self);
  client.say(channel, 'Kyuobot is online!');
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

function onErrorHandler(e){
  console.error(e)
  throw new Error('CRITICAL ERROR: ' + e.message);
}

function updateWheel (user, message, target){
  if(!message){return;}
  message= message.toLowerCase();
  
  const length= categories.length;
  let votedCategory= "Invalid";
  let i
  for( i=0; i < length; i++){
    if (message.indexOf(categories[i])!=-1) {
      console.log(`Got one: ${categories[i]}`);
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
    console.log(votedCategory);
    const insertStmt= db.prepare(SQL.insertUserVote);
    insertStmt.run(user, votedCategory);
    insertStmt.finalize();
    const sql= SQL.allUserVotes;
    db.all(sql, [], (err, rows) => {
      if (err) {
        throw err;
      }
      rows.forEach((row) => {
        console.log(row.categoryName+" : "+row.userName);
      });
    });
  }
}

function printWheel(target){
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
  let deleteStmt= db.prepare (SQL.deleteUserVotes);
  deleteStmt.run("%"+targetCategory+"%");
  deleteStmt.finalize();
}

function isMod(context){
  if(context['badges']){
    if(context['user-type'] == "mod" || !context['badges']['broadcaster'] === null){
      return true;
    }
  }
}

function isSub(context){
  if(context['badges']){
    if(context['badges']['subscriber'] ){
      return true;
    }
    return true;
  }
}

