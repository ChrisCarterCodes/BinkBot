const tmi = require('tmi.js');
const config = require('config');
const sqlite = require('sqlite');
const dbPromise = sqlite.open('weights', { Promise });
console.log(typeof dbPromise);
const db = initialize();
async function initialize(){
  try{
  let db = await dbPromise;
  console.log(` db: ${db}`);
  db.run("CREATE TABLE IF NOT EXISTS userVotes (userName TEXT , categoryName TEXT )");
  //db.run("drop table userinfo");
  db.run("CREATE TABLE IF NOT EXISTS userInfo (userName TEXT PRIMARY KEY , availableWheelVotes INT DEFAULT 0 )");
  return db
}
  catch (err) {
    throw err;
  }
}

console.log(config);

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
    username: config.get('Bot.username'),
    password: config.get('Bot.password')
  },
  channels: config.get('Bot.channels')
};

// Create a client with our options
const client = new tmi.client(opts);
var gtBetMode= false;
var bets= {};
var winners=[];

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('subscription', onSubHandler);
client.on('resub', onSubResubHandler)

// Connect to Twitch:
client.connect();

function gtBets(context, target, action, modFlag){
  var user=context.username;
    if(action == 'open' && !gtBetMode && modFlag){
      //enable bets
      gtBetMode=true;
      //reset leftover bets
      bets={};
      //reset the last winners
      winners=[];
      //client.say(target, `Get your bets in! type '!bet <number>' to place your bets for the GT chest!`);
    }
    else if(action == 'close' && gtBetMode && modFlag){ 
      gtBetMode=false;
      //client.say(target, `Bets are closed! Best of luck everyone!`);
    }
    else if(!isNaN(action)){
      if (!gtBetMode){
        //client.say(target, `You either missed the betting, or we're not headed to GT. Or you're bored.`);
        return;
      }
      if(action <=22 && action>=1){
        bets[user] = action;
      }
      else{
        //client.say(target, `There's 22 checks in GT, buddy.`);
      }
    }
    console.log(bets);
}

function gtWinner(target, context, action){
  console.log(winners);
  if (winners.length>0){
      //client.say(target, `The winners have already been determined, they were ${winners.join(" , ")}`);
      return;
  }
  if(!gtBetMode){
    if(action <=22 && action>=1){
      for (user in bets){
        if (bets[user] == action){winners.push(user); incrementUserVotes(user);}
      }
      if(winners.length == 0){winners=['no one :c']}
      //client.say(target, `The winning chest was ${action}! Congratulations to ${winners.join(" , ")}`);
    }
    else{
      //client.say(target, `There's 22 checks in GT, buddy.`);
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
  var modFlag=isMod(context);

  if(commandParts[0].toLowerCase() == '!bet'  ){
    if(commandParts.length > 1){
      gtBets(context, target, commandParts[1], modFlag);
    }
    else{
      //client.say(target, `Place your bets on GT! Just enter '!bet <number>' to bet!`);
    }
  }
  if(commandParts[0].toLowerCase() == '!betwinner'  ){
    if(commandParts.length > 1 && modFlag){
      gtWinner(target, context, commandParts[1]);
    }
  }
  if(commandParts[0].toLowerCase() == '!betstatus'  ){
    var outputText=JSON.stringify(bets, null, 1);
    outputText=outputText.replace(/("{|}")/gi,'"');
    //client.say(target, `Current bets: ${outputText}`);
  }
  if(commandParts[0].toLowerCase() == '!wheeladd'  ){
    if(commandParts.length > 1){
      updateWheel(context['username'], msg, target);
    }
  }
  if(commandParts[0].toLowerCase() == '!wheeloptions'  ){
    //client.say(target, `Valid categories: ${categories.join(" , ")}`);
  }
  if(commandParts[0].toLowerCase() == '!wheelvotes'  ){
    printWheel(target);
  }
  if(commandParts[0].toLowerCase() == '!wheelclear'  ){
    if(commandParts.length >1 && isMod){
      clearWheel(commandParts[1]);
    }
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


// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

function updateWheel (user, message, target){
  if(!message){
    incrementUserVotes(user);
    return;
  }
  message= message.toLowerCase();
  
  var length= categories.length;
  var votedCategory= "Invalid";
  var i;
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
      //client.say(target, `You didn't request a variation to put weight into! Type !wheel for more info.`);
      return;
    }
    incrementUserVotes(user);
  }
  else{
    console.log(votedCategory);
    
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
  var message= "Current Votes: "
  var sql= ("SELECT categoryName, count(categoryName) as counts, group_concat(userName) as users FROM userVotes group by categoryName order by categoryName");
  var response= new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        throw err;
      }
      else{
        var finalString="";
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
      //client.say(target, `${value}`);
    }
    else{
      //client.say(target, "No votes!");
    }
  });
}

function clearWheel(targetCategory){
  var deleteStmt= db.prepare ("DELETE FROM userVotes WHERE categoryName like ?");
  deleteStmt.run("%"+targetCategory+"%");
  deleteStmt.finalize();
}

function isMod(context){
  if(context['badges']){
    if(context['user-type'] == "mod" || context['badges']['broadcaster'] ){
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

function incrementUserVotes(user){
  var addWheelWeightStmt= db.run("INSERT INTO userInfo(userName, availableWheelVotes) VALUES (?, 1)  ON CONFLICT(userName) DO UPDATE SET availableWheelVotes=availableWheelVotes+1;", user);
    addWheelWeightStmt.run(user);
    addWheelWeightStmt.finalize();
    var sql= ("SELECT * FROM userInfo");
    db.all(sql, [], (err, rows) => {
      if (err) {
        throw err;
      }
      rows.forEach((row) => {
        console.log(row.userName+" : "+row.availableWheelVotes);
      });
    });
}

function decrementUserVotes(user){
  var addWheelWeightStmt= db.prepare("INSERT INTO userInfo(userName, availableWheelVotes) VALUES (?, 0)  ON CONFLICT(userName) DO UPDATE SET availableWheelVotes=availableWheelVotes-1;");
    addWheelWeightStmt.run(user);
    addWheelWeightStmt.finalize();
    var sql= ("SELECT * FROM userInfo");
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
  var insertStmt= db.prepare("INSERT OR REPLACE INTO userVotes VALUES (? , ?) ");
    insertStmt.run(user, votedCategory);
    insertStmt.finalize();
    var sql= ("SELECT * FROM userVotes");
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
  var insertStmt= db.prepare("SELECT availableWheelVotes as count from userInfo where userName=? ");
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
