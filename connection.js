var mongoose = require("mongoose");
module.exports = (url) => {
  mongoose.connect(url, {
    useNewUrlParser: true,
  });
  var conn = mongoose.connection;
  conn.on("connected", function () {
    console.log("database is connected successfully");
  });
  conn.on("disconnected", function () {
    console.log("database is disconnected successfully");
  });
  conn.on("error", console.error.bind(console, "connection error:"));
  return conn;
};