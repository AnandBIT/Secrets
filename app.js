//jshint esversion:6
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

app.use(bodyParser.urlencoded({
    extended: true
}));
app.set("view engine", "ejs");
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

const secret = "thisisourlittlesecret.";
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"]});

const User = mongoose.model("USER", userSchema);

app.route("/")
    .get(function (req, res) {
        res.render("home");
    });


app.route("/register")
    .get(function (req, res) {
        res.render("register");
    })

    .post(function (req, res) {
        const newUser = new User({
            email: req.body.username,
            password: req.body.password
        });
        newUser.save(function (err) {
            if (!err)
                res.render("secrets");
        });
    });


app.route("/login")
    .get(function (req, res) {
        res.render("login");
    })

    .post(function (req, res) {
        User.findOne({
            email: req.body.username,
        }, function (err, foundUser) {
            if (foundUser) {
                if (foundUser.password === req.body.password)
                    res.render("secrets");
                else
                    res.render("login");
            } else {
                res.render("register");
                console.log(err);
            }
        });
    });


app.listen(3000, function () {
    console.log("The server has started running on port 3000");
});