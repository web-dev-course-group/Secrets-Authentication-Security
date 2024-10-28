//jshint esversion:6

/*
Web Development Course with Angela Yu
based on Sections 32
Started on: 2021-05-03

Current Android system set-up used to develope this app:
Samsung Galaxy S8 - Android 9
Phone model - SM-G950U
Termux v0.101
  -node v14.15.4
  -npm mongodb 3.6.6
  -npm mongoose 5.12.7
Dory MongoDB v0.1.3
  -mongoDB server 3.4.2 (old)
  -open source app
Mongo Explorer v2.0.0 (Build 10)
  -mongo client, open source app, java
*/

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(session({
  secret: "Our little secret or any other long string.",
    resave: false,
    saveUninitialized: false
})); //sets the session

app.use(passport.initialize());
app.use(passport.session());

//console.log(process.env.API_KEY); //for checking, this is how an enviromental variable from .env file can be retreaved

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true}));

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true); //Added to resolve: (node:30616) DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead.

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose); //used to hash and salt passwords and add them mongo database
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy()); //creates local mongoose strategy

//passport.serializeUser(User.serializeUser()); //creates session cookie, for local authentication only
//passport.deserializeUser(User.deserializeUser()); //delete session cookie, for local authentication only

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https//www.googleapis.com/oauth2/v3/userinfo" //added to fix deprication of google plus
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile); //for checking
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    }); //.findOrCreate was pseudo-code, however someone actually made into a function
  }
));

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication
    res.redirect("/secrets");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res) {
  //check if user is logged in before rendering the sercrets page
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res) {
  req.logout(); //passport method
  res.redirect("/");
});

app.post("/register", function(req, res) {
  
  User.register({username: req.body.username}, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      }); //creates a cookie for the logged-in user
    }
  });
  
});

app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    passport: req.body.passport
  }); //from login form

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      }); //creates a cookie for the logged-in user
    }
  }); //passport function

});

app.listen(3000, function() {
  console.log("Server started on port 3000.");
});

