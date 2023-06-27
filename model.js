const mongoose = require("mongoose");

var userSchema = new mongoose.Schema({
  uid: String,
  created: {
    type: Date,
    default: Date.now,
  },
  modified: {
    type: Date,
    default: Date.now,
  },
  fname: String,
  lname: String,
  email: String,
  password: String,
  username:String,
});

const tokenSchema = new mongoose.Schema({
  user:String, 
  access:String, 
  refresh:String
})

module.exports = {
  userSchema: new mongoose.model("user", userSchema, "auth-users"),
  tokenSchema: new mongoose.model("seed", tokenSchema, "auth-seeds"),
};