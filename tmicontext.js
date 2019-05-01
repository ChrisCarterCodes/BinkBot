class TmiContext{
    constructor(username, isMod, isSub){
        this.username=username;
        this.isMod=isMod;
        this.isSub=isSub
    }

    static parse(context){
        let username=context['username'];
        let isMod, isSub = false;
        if(context.badges){
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