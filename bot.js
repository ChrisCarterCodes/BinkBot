const path = require('path');
require('dotenv').config({path: path.join(__dirname, '.env')});

const tmi = require('tmi.js');
const TmiContext= require('./tmicontext.js');

const config = require('./config/config');
const sqlite = require('sqlite');
const dbPromise = sqlite.open('weights', { Promise });
const SQL = require('./config/sql');
console.log(typeof dbPromise);
const db = initialize();
async function initialize(){
  try{
  let db = await dbPromise;
  console.log(` db: ${db}`);
  db.run(SQL.createUserVotesTable);
  //db.run("drop table userinfo");
  db.run(SQL.createUserInfoTable);
  return db
}
  catch (err) {
    throw err;
  }
}


const categories= [ "enemizer", "boss shuffle", "retro", "keysanity", "inverted", "basic",
                      "standard", "open",
                      "kill pig", "all dungeons", 
                      "assured", "random weapon", "swordless",
                      "normal", "hard" ];

//Define base db tables
/* db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS userVotes (userName TEXT , categoryName TEXT )");
  //db.run("drop table userinfo");
  db.run("CREATE TABLE IF NOT EXISTS userInfo (userName TEXT PRIMARY KEY , availableWheelVotes INT DEFAULT 0 )");
}); */

// Define configuration options
const opts = {
  connection: {
    reconnect: true // This
  },
  identity: {
    username: process.env.TWITCH_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN
  },
  channels: [process.env.TWITCH_TARGET_CHANNELS]
};
console.log(opts);

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
  console.log(action, modFlag)
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
      for (user in bets){
        if (bets[user] == action){winners.push(user); incrementUserVotes(user);}
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

  let tmiContext= TmiContext.parse(context);
  console.log(tmiContext.isMod);

  let outputText = '' // initialize in case we use
  const cmd = commandParts[0].toLowerCase()

  if(cmd[0] !== '!') return // we don't have a command, don't process

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
      if(commandParts.length > 1){
        updateWheel(context['username'], msg, target);
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
  if(commandParts[0].toLowerCase() == '!adduservote'  ){
    if(commandParts.length >1 && isMod){
      incrementUserVotes(commandParts[1]);
    }
  }
}

function onSubHandler (channel, username, method, message, userstate) {
  onSubResubHandler(channel, username, 1 , message, userstate, method)
}

function onSubResubHandler (channel, username, months, message, userstate, methods) {
  updateWheel(username, message, channel);
}

function onJoinHandler(channel, username, self) {
  if(self){
    console.log('Bot joined channel: %s %s %s', channel, username, self);
  }
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
  if(!message){
    incrementUserVotes(user);
    return;
  }
  message= message.toLowerCase();
  
  const length= categories.length;
  let votedCategory= "Invalid";
  let i
  for( i=0; i < length; i++){
    if (message.indexOf(categories[i])!=-1) {
      console.log(`Got one: ${categories[i]}`);
      votedCategory= categories[i];
      let votes=  getVoteCount(user);
      console.log( votes );
      if(votes>0){
        addVote(user, votedCategory);
      }
    }
  }
  if(votedCategory == "Invalid"){
    if(message.includes('!wheeladd')){
      client.say(target, `You didn't request a variation to put weight into! Type !wheel for more info.`);
      return;
    }
    incrementUserVotes(user, target);
  }
  else{
    console.log(votedCategory);
    
  }
}

function printWheel(target){
  const sql= SQL.categoryCounts;
  const response= new Promise((resolve, reject) => {
    db.all(sql, target, (err, rows) => {
      if (err) {
        throw err;
      }
      else{
        let finalString="";
        rows.forEach((row) => {
        finalString += `${row.categoryName} : ${row.counts} (${row.users})      `;
        });
        resolve(finalString);
      }
    });
  });
  response.then((value) =>{
    if(value){
      client.say(target, `Current votes: ${value}`);
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



function incrementUserVotes(user, channel){
  var addWheelWeightStmt= db.run(SQL.incrementUserVote, user);
    addWheelWeightStmt.run(user);
    addWheelWeightStmt.finalize();
    var sql= (SQL.getUserInfo);
    db.all(sql, [], (err, rows) => {
      if (err) {
        throw err;
      }
      rows.forEach((row) => {
        console.log(row.userName+" : "+row.availableWheelVotes);
      });
    });
}

function decrementUserVotes(user, channel){
  var addWheelWeightStmt= db.prepare(SQL.decrementUserVote);
    addWheelWeightStmt.run(user);
    addWheelWeightStmt.finalize();
    var sql= (SQL.getUserInfo);
    db.all(sql, [], (err, rows) => {
      if (err) {
        throw err;
      }
      rows.forEach((row) => {
        console.log(row.userName+" : "+row.availableWheelVotes);
      });
    });
}

function addVote(user, votedCategory){
  var insertStmt= db.prepare(SQL.addVote);
    insertStmt.run(user, votedCategory);
    insertStmt.finalize();
    var sql= (SQL.getVotes);
    db.all(sql, [], (err, rows) => {
      if (err) {
        throw err;
      }
      rows.forEach((row) => {
        console.log(row.categoryName+" : "+row.userName);
      });
    });
}

async function getVoteCount(user){
  var insertStmt= db.prepare(SQL.getVoteCount);
  var voteCount=0;
  let promise= new Promise(function(resolve, reject){
    insertStmt.get([user],  (err, row) =>{
      if(err){
        return reject(err);
      }
      voteCount = row.count;
      return resolve(voteCount);
    });
  });
  voteCount= await promise;
  return voteCount;
}