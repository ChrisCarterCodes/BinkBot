module.exports = {
    categoryCounts: "SELECT categoryName, count(categoryName) as counts, group_concat(userName) as users FROM userVotes group by categoryName order by categoryName",
    allUserVotes: "SELECT * FROM userVotes",
    insertUserVote: "INSERT OR REPLACE INTO userVotes VALUES (? , ?) ",
    createUserVotesTable: "CREATE TABLE IF NOT EXISTS userVotes (userName TEXT , categoryName TEXT )",
    deleteUserVotes: "DELETE FROM userVotes WHERE categoryName like ?"
}
