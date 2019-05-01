module.exports = {
    categoryCounts: "SELECT categoryName, count(categoryName) as counts, group_concat(userName) as users FROM userVotes where channel=?\
                    group by categoryName order by categoryName",
    allUserVotes: "SELECT categoryName, sum(numberVotes) as count FROM userVotes where channel = ? group by categoryName",
    insertUserVote: "INSERT OR REPLACE INTO userVotes VALUES (?, ?) ",
    createUserVotesTable: "CREATE TABLE IF NOT EXISTS userVotes (channel TEXT, userName TEXT , categoryName TEXT, numberVotes INT DEFAULT 0,\
                             PRIMARY KEY (channel, userName, categoryName) )",
    createUserInfoTable: "CREATE TABLE IF NOT EXISTS userInfo (channel TEXT , userName TEXT , availableWheelVotes INT DEFAULT 0, PRIMARY KEY (channel, userName) )",
    deleteUserVotes: "DELETE FROM userVotes WHERE channel = ? and categoryName like ?",
    decrementUserVote: "INSERT INTO userInfo(channel, userName, availableWheelVotes) VALUES (?, ?, 0)  ON CONFLICT(channel, userName)\
                        DO UPDATE SET availableWheelVotes=availableWheelVotes-1;",
    incrementUserVote: "INSERT INTO userInfo(channel, userName, availableWheelVotes) VALUES (?, ?, 1)  ON CONFLICT(channel, userName)\
                        DO UPDATE SET availableWheelVotes=availableWheelVotes+1;",
    addVote: "INSERT OR REPLACE INTO userVotes(channel , userName , categoryName, numberVotes ) VALUES (?, ?, ?, 1) ON CONFLICT(channel, userName, categoryName)\
            DO UPDATE SET numberVotes=numberVotes+1; ",
    getVotes: "INSERT OR REPLACE INTO userVotes VALUES (?, ?) ",
    getUserInfo: "SELECT * FROM userInfo where channel = ?",
    getVoteCount: "SELECT availableWheelVotes as count from userInfo where channel= ? and userName=? "
}
