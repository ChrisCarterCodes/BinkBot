class TmiContext{
    constructor(username, isMod, isSub){
        this.username=username;
        this.isMod=isMod;
        this.isSub=isSub
    }

    static parse(context){
        let username=context['username'];
        let isMod, isSub = false;
        console.log(context);
        if(context.hasOwnProperty('badges')){
          console.log(context['user-type'] === "mod");
          console.log(context.badges.hasOwnProperty('broadcaster'));
          if((context['user-type'] === "mod") || (context.badges.hasOwnProperty('broadcaster'))){
            isMod=true;
          }
          if(context.badges.hasOwnProperty('subscriber') ){
            isSub = true;
          }
        }
        return new TmiContext(username, isMod, isSub);
    }
}

module.exports = TmiContext;