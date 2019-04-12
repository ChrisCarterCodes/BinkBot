const tmi = require('tmi.js');
const config = require('config');
console.log(config);

// Define configuration options
const opts = {
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
      if(action <=21 && action>=1){
        bets[user] = action;
      }
      else{
        client.say(target, `There's 21 checks in GT, buddy.`);
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
    if(action <=21 && action>=1){
      for (user in bets){
        if (bets[user] == action){winners.push(user)}
      }
      if(winners.length == 0){winners=['no one :c']}
      client.say(target, `The winning chest was ${action}! Congratulations to ${winners.join(" , ")}`);
    }
    else{
      client.say(target, `There's 21 checks in GT, buddy.`);
    }
  }
}

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
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
      client.say(target, `Place your bets on GT! Just enter '!bet <number>' to bet!`);
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
    client.say(target, `Current bets: ${outputText}`);
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

function isMod(context){
  if(context['badges']){
    if(context['user-type'] == "mod" || context['badges']['broadcaster'] == 1){
      return true;
    }
  }
}