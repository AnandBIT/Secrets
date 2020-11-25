//jshint esversion:6
require('dotenv').config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

app.use(function (req, res, next) {
    if (process.env.NODE_ENV === 'production') {
        if (req.headers['x-forwarded-proto'] !== 'https')
            return res.redirect('https://' + req.headers.host + req.url);
        else
            return next();
    } else
        return next();
});

app.use(bodyParser.urlencoded({
    extended: true
}));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 600000,
        // httpOnly: false // Vulnerable, as the cookie can be accessed in the browser's console by typing document.cookie;
        // secure: true
    },
    // name: "User's session I'd"
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String
});

const secretSchema = new mongoose.Schema({
    name: String,
    secrets: [String]
});
const Secret = mongoose.model("SECRET", secretSchema);

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("USER", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets"
        // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);
        User.findOrCreate({
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.route("/")
    .get(function (req, res) {
        res.render("home");
    });




app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile']
    }));

app.get('/auth/google/secrets',
    passport.authenticate('google', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        res.redirect('/secrets');
    });



app.get("/secrets", function (req, res) {
    if (req.isAuthenticated()) {

        Secret.findOne({
            name: "USER SECRETS"
        }, function (err, foundDoc) {
            if (err) {
                console.log(err);
            } else {
                res.render("secrets", {
                    secrets: foundDoc.secrets
                });
            }
        });
        // console.log(req.session.id);
        // console.log(req.session.cookie);
    } else {
        res.redirect("/login");
    }
});





app.route("/submit")
    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.render("submit");
        } else {
            res.redirect("/login");
        }
    })

    .post(function (req, res) {
        const submittedSecret = req.body.secret;

        Secret.findOne({
            name: "USER SECRETS"
        }, function (err, foundDoc) {
            if (err) {
                console.log(err);
            } else if (!foundDoc) {
                const newSecret = new Secret({
                    name: "USER SECRETS",
                    secrets: ["This is a secret that this website is built by a human 😂"]
                });
                newSecret.save(function (err) {
                    if (!err) {
                        res.redirect("/secrets");
                    }
                });
            } else if (foundDoc) {
                foundDoc.secrets.push(submittedSecret);
                foundDoc.save();
                res.redirect("/secrets");
            }
        });
    });




app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});




app.route("/register")
    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.redirect("/secrets");
        } else {
            res.render("register");
        }
    })

    .post(function (req, res) {
        User.register({
            username: req.body.username
        }, req.body.password, function (err, user) {
            if (err) {
                res.render("error", {
                    message: err.message
                });
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                });
            }
        });

    });




app.route("/login")
    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.redirect("/secrets");
        } else {
            res.render("login");
        }
    })

    .post(function (req, res) {
        const newUser = new User({
            username: req.body.username,
            password: req.body.password
        });
        req.login(newUser, function (err) {
            if (err) {
                console.log(err);
                res.redirect("/login");
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                });
            }
        });
    });


app.listen(3000, function () {
    console.log("The server has started running on port 3000");
});