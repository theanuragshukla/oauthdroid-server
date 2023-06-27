const express = require("express");
require("dotenv").config();
const app = express();
const http = require("http").Server(app);
const port = process.env.PORT || 3000;
const secret = process.env.JWT_SECRET;
const jwt = require("jsonwebtoken");
const URL = process.env.MONGO_URL;
const validate = require("./Validator");
const conn = require("./connection")(URL);
const { userSchema, tokenSchema } = require("./model");
const bcrypt = require("bcryptjs");
const saltRounds = 10;
const crypto = require("crypto");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());


const generateTokens = async(uid) => {
        const seed = crypto.randomBytes(8).toString("hex");
        const accessToken =  jwt.sign({ data: uid, seed, usage:"access" }, secret, {
          expiresIn: "60s",
        });
        const refreshToken = jwt.sign({ data: uid, seed , usage:"refresh"}, secret, {
          expiresIn: "7d",
        });
        return {
          seed, accessToken, refreshToken
        }
}

app.get("/", (_, res) => res.json({ status: true, msg: "Alive!" }));

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return;
    const errors = validate.validate({ signup: false, username, password });
    if (!errors.username) {
      res.json({ status: false, msg: "Invalid Username" });
      return;
    } else if (!errors.password) {
      res.json({ status: false, msg: "Invalid Password" });
      return;
    }
    const exists = await userSchema.findOne({ username });
    if (!exists) {
      res.json({ status: false, msg: "Wrong email or password" });
    } else {
      const match = await bcrypt.compare(password, exists.password);
      if (match) {
        const { uid, fname, lname, username, email } = exists;
        const {seed, accessToken, refreshToken} = await generateTokens(uid)
        await tokenSchema.updateOne(
          { user: uid },
          { user: uid, access: seed, refresh: seed },
          { upsert: true }
        );
        res.json({
          status: true,
          accessToken, 
          refreshToken, 
          user: { uid, fname, lname, email, username },
        });
      } else {
        res.json({ status: false, msg: "wrong username or password" });
      }
    }
  } catch (e) {
    res
      .status(500)
      .json({ status: false, msg: "No Username and Password Provided" });
  }
});

app.post("/signup", async (req, res) => {
  try {
    const { fname, lname, email, password, username } = req.body;
    const errors = await validate.validate({
      fname,
      lname,
      username,
      email,
      password,
    });
    if (!errors.username) {
      res.json({ status: false, msg: "Invalid Username" });
      return;
    } else if (!errors.email) {
      res.json({ status: false, msg: "Invalid Email" });
      return;
    } else if (!errors.password) {
      res.json({ status: false, msg: "Invalid Password" });
      return;
    } else if (!errors.fname) {
      res.json({ status: false, msg: "Invalid FirstName" });
      return;
    } else if (!errors.lname) {
      res.json({ status: false, msg: "Invalid LastName" });
      return;
    }

    const dupEmail = await userSchema.findOne({ email: email });
    if (dupEmail) {
      res.json({ status: false, msg: "Email already Registered" });
      return;
    }

    const dupUser = await userSchema.findOne({ username: username });
    if (dupUser) {
      res.json({ status: false, msg: "Username already Registered" });
      return;
    }
    var passhash;
    await bcrypt.hash(password, saltRounds).then(function (hash) {
      passhash = hash;
    });
    const uid = crypto.randomBytes(16).toString("hex");
    const newUser = {
      uid,
      fname,
      lname,
      email,
      username,
      password: passhash,
    };
    try {
      await new userSchema(newUser).save();
      const {seed, accessToken, refreshToken} = await generateTokens(uid)
      await new tokenSchema({ user: uid, access: seed, refresh: seed }).save();
      res.json({
        status: true,
        accessToken,
        refreshToken,
        user: { uid, fname, lname, email, username },
      });
    } catch (err) {
      res.json({ msg: "some error occoured", status: false });
    }
  } catch (e) {
    res.status(500).json({ status: false, msg: "Internal Server Error" });
  }
});

app.post("/check-dup", async (req, res) => {
  try {
    const { email, username } = req.body;
    if (email) {
      const dupMail = await userSchema.findOne({ email: email });
      if (dupMail) {
        res.json({ status: false, msg: "Email already in use" });
        return;
      }
    } else if (username) {
      const dupUser = await userSchema.findOne({ username: username });
      if (dupUser) {
        res.json({ status: false, msg: "Username already in use" });
        return;
      }
    }
    res.json({ status: true });
  } catch (e) {
    res.status(500).json({ status: false, msg: "Invalid Request" });
  }
});

app.get("/token", async (req, res) => {
  try {
    const { userId } = req.query;
    const refreshToken = req.headers["x-refresh-token"];
    const data = jwt.verify(refreshToken, secret);
    const {data:tokenUid, seed} = data
    if (tokenUid === userId) {
      const isValid = await tokenSchema.findOne({user:tokenUid});
      if (!isValid || isValid["refresh"]!==seed) {
        res.json({ status: false, msg: "Invalid Headers 1" });
        return;
      }
    const exists = await userSchema.findOne({ uid:tokenUid });
    if(!exists){
      res.json({status:false, msg:"Invalid Headers 2"})
    }
      const { uid, fname, lname, username, email } = exists;
      const tokens =await generateTokens(uid)
      await tokenSchema.updateOne(
        { user: uid },
        { user: uid, access: tokens.seed, refresh:tokens.seed },
        { upsert: true }
      );
      res.json({
        status: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: { uid, fname, lname, email, username },
      });
    }else{
    res.status(500).json({ status: false, msg: "Invalid UserId or Headers" });
    }
  } catch (e) {
    res.status(500).json({ status: false, msg: "Invalid UserId or Headers" });
  }
});

app.use(async (req, res, next) => {
  const accessToken = req.headers["x-access-token"];
  if (!accessToken) {
    res.json({ status: false, msg: "User unauthorised" });
    return;
  } else {
    let data;
    try {
      data = jwt.verify(accessToken, secret);
    } catch (e) {
      res.json({ status: false, msg: "Token Expired" });
      return;
    }
    if (data) {
      const { data: uid, seed } = data;
      const isValid = await tokenSchema.findOne({ user: uid, access: seed });
      if (!isValid) {
        res.json({ status: false, msg: "User unauthorised" });
        return;
      }
      const prof = await userSchema.findOne({ uid });
      req.usrProf = prof;
      next();
    } else {
      return;
    }
  }
});

app.get("/profile", (req, res) => {
  res.json({status:true, user:req.usrProf});
});

app.get('/logout', async(req, res)=>{
  try{
      await tokenSchema.deleteOne({user:req.usrProf.uid})
      res.json({status:true, msg:"Logged Out Successfully"})
  }catch(e){
    res.json({status:false, msg:"Unauthourized"})
  }
})

http.listen(port, () => {
  console.log(`running on port ${port}`);
});

