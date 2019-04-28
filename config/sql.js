module.exports = {
    categoryCounts: "SELECT categoryName, count(categoryName) as counts, group_concat(userName) as users FROM userVotes where channel=? group by categoryName order by categoryName",
    allUserVotes: "SELECT * FROM userVotes",
    insertUserVote: "INSERT OR REPLACE INTO userVotes VALUES (? , ?) ",
    createUserVotesTable: "CREATE TABLE IF NOT EXISTS userVotes (channel TEXT, userName TEXT , categoryName TEXT, numberVotes INT DEFAULT 0, PRIMARY KEY (channel, userName) )",
    createUserInfoTable: "CREATE TABLE IF NOT EXISTS userInfo (channel TEXT , userName TEXT , availableWheelVotes INT DEFAULT 0, PRIMARY KEY (channel, userName) )",
    deleteUserVotes: "DELETE FROM userVotes WHERE categoryName like ?",
    decrementUserVote: "INSERT INTO userInfo(userName, availableWheelVotes) VALUES (?, 0)  ON CONFLICT(userName) DO UPDATE SET availableWheelVotes=availableWheelVotes-1;",
    incrementUserVote: "INSERT INTO userInfo(userName, availableWheelVotes) VALUES (?, 1)  ON CONFLICT(userName) DO UPDATE SET availableWheelVotes=availableWheelVotes+1;",
    addVote: "INSERT OR REPLACE INTO userVotes VALUES (? , ?) ",
    getVotes: "INSERT OR REPLACE INTO userVotes VALUES (? , ?) ",
    getUserInfo: "SELECT * FROM userInfo",
    getVoteCount: "SELECT availableWheelVotes as count from userInfo where userName=? "
}
