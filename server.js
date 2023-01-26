const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const mongoose = require("mongoose");

mongoose.connect("mongodb+srv://Kamil:10tizovo@cluster0.jbqvj.mongodb.net/Cluster0?retryWrites=true&w=majority", {useUnifiedTopology: true, useNewUrlParser: true});

module.exports = {app, server, mongoose}