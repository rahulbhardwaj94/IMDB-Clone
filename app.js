require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const { rmSync } = require("fs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const { profile } = require("console");
const https = require("https");
const { response } = require("express");

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// passport
app.use(
  session({
    secret: "this is a secret",
    resave: false,
    saveUninitialized: false,
  })
);

// passport authentication -- start using it for authentication
app.use(passport.initialize());

// passport to start express-session that we created before
app.use(passport.session());

// DB Connection
mongoose.connect(process.env.MDB, { useNewUrlParser: true });

// Schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,

  // mylist : [{movieName: String, otherInfo: String}]
});

//  Use to hash & salt our password AND to save users to database(DB)
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Model
const User = new mongoose.model("User", userSchema);

// Passport Local Configuration
// Create a local strategy
passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/userpage",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

// Home
app.get("/", (req, res) => {
  res.render("home");
});

// Google Authentication
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/userpage",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/userpage");
  }
);

// UserPage
app.get("/userpage", (req, res) => {
    
  if (req.isAuthenticated()) {
    res.render("userpage");
  } else {
    res.redirect("/login");
  }
});

// Register
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    (err, foundUser) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        // Logged-in Session
        passport.authenticate("local")(req, res, () => {
          res.redirect("/userpage");
        });
      }
    }
  );
});

// Login
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/userpage");
      });
    }
  });
});

// Logout
app.get("/logout", (req, res) => {
  // deAuthenticate User
  req.logout();
  res.redirect("/");
});

// Integrating API


app.get("/search", (req, res) => {
    // API call
    const apiUrlKey = process.env.API_KEY;
    const movieVariableName = req.query.movie;
    const apiHit = "https://www.omdbapi.com/?t=" + movieVariableName +"&apikey=" + apiUrlKey;
  
    https.get(apiHit, (response) => {
      console.log(response.statusCode);
  
      let responseData = "";
      response.on("data", function (data) {
        responseData += data.toString();
      });
      response.on("end", function () {
        const movieData = JSON.parse(responseData);
        const Title = movieData.Title;
        const Year = movieData.Year;
        const Poster = movieData.Poster;
        const Actors = movieData.Actors;
        const Rated = movieData.Rated;
        const Released = movieData.Released;
        const Genre = movieData.Genre;
        const Runtime = movieData.Runtime;
        const Plot = movieData.Plot;
        const Director = movieData.Director;
        const Writer = movieData.Writer;
        const imdbSource = movieData.Ratings[0].Source;
        const imdbValue = movieData.imdbRating;
        const rottenSource = movieData.Ratings[1].Source;
        const rottenValue = movieData.Ratings[1].Value;
        const metaSource = movieData.Ratings[2].Source;
        const metaValue = movieData.Ratings[2].Value;
        

        res.render("search", {
            Title:Title,
            Year: Year,
            Poster: Poster,
            Rated : Rated, 
            Released : Released,
            Genre : Genre, 
            Runtime : Runtime,
            imdbSource: imdbSource,
            imdbValue: imdbValue,
            rottenSource: rottenSource,
            rottenValue: rottenValue,
            metaSource: metaSource,
            metaValue: metaValue, 
            Plot : Plot,
            Director: Director,
            Writer : Writer,
            Actors: Actors
        });
      });
    });
  });


// Listen
app.listen(process.env.PORT || 3000, () => {
  console.log("Server is running on port 3000");
});
