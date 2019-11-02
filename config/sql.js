module.exports = {
    allUserVotes: "SELECT categories.categoryName, COALESCE(sum(userVotes.numberVotes), 0 ) as count, categoryGroup \
                    FROM categories left join (select * from userVotes where userVotes.channel= ?) userVotes\
                    on categories.categoryName=userVotes.categoryName \
                    group by categories.categoryName \
                    order by \
                    CASE categories.categoryGroup\
                        WHEN 'Mode' THEN 1\
                        WHEN 'Twist' THEN 2\
                        ELSE 3 \
                    END\
                    COLLATE NOCASE",
    insertUserVote: "INSERT OR REPLACE INTO userVotes VALUES (?, ?) COLLATE NOCASE",
    createUserVotesTable: "CREATE TABLE IF NOT EXISTS userVotes (channel TEXT, userName TEXT , categoryName TEXT, numberVotes INT DEFAULT 0,\
                             PRIMARY KEY (channel, userName, categoryName) )",
    createCategoriesTable: "CREATE TABLE if not exists categories (categoryName	TEXT,categoryGroup TEXT NOT NULL, votable INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(categoryName));\
                            Insert or replace into categories values ('Basic Bitch','Mode', 1);\
                            Insert or replace into categories values ('Inverted','Mode', 1);\
                            Insert or replace into categories values ('Keysanity','Mode', 1);\
                            Insert or replace into categories values ('OpenGT','Mode', 1);\
                            Insert or replace into categories values ('Retro','Mode', 1);\
                            Insert or replace into categories values ('Boss Shuffle','Twist', 1);\
                            Insert or replace into categories values ('All Dungeons','Twist', 1);\
                            Insert or replace into categories values ('Beatable','Twist', 1);\
                            Insert or replace into categories values ('Enemizer','Twist', 1);\
                            Insert or replace into categories values ('Hard','Twist', 1);\
                            Insert or replace into categories values ('MC Shuffle','Twist', 1);\
                            Insert or replace into categories values ('Random Goal','Twist', 1);\
                            Insert or replace into categories values ('Swordless','Twist', 1);\
                            Insert or replace into categories values ('Vanilla Swords','Twist', 1);",
    createUserInfoTable: "CREATE TABLE IF NOT EXISTS userInfo (channel TEXT , userName TEXT , availableWheelVotes INT DEFAULT 0, PRIMARY KEY (channel, userName) )",
    deleteUserVotes: "DELETE FROM userVotes WHERE channel = ? and categoryName like ?",
    decrementUserVote: "INSERT INTO userInfo(channel, userName, availableWheelVotes) VALUES (?, ?, 0)  ON CONFLICT(channel, userName)\
                        DO UPDATE SET availableWheelVotes=availableWheelVotes-1 COLLATE NOCASE",
    incrementUserVote: "INSERT INTO userInfo(channel, userName, availableWheelVotes) VALUES (?, ?, 1)  ON CONFLICT(channel, userName)\
                        DO UPDATE SET availableWheelVotes=availableWheelVotes+1 COLLATE NOCASE",
    addVote: "INSERT OR REPLACE INTO userVotes(channel , userName , categoryName, numberVotes ) VALUES (?, ?, ?, 1) ON CONFLICT(channel, userName, categoryName)\
            DO UPDATE SET numberVotes=numberVotes+1; COLLATE NOCASE",
    getVotes: "INSERT OR REPLACE INTO userVotes VALUES (?, ?) COLLATE NOCASE ",
    getUserInfo: "SELECT * FROM userInfo where channel = ?",
    getVoteCount: "SELECT availableWheelVotes as count from userInfo where channel= ? and userName=? COLLATE NOCASE",
    getCategories: "SELECT categoryName FROM categories where votable = 1"

}
