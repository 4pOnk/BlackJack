const {Schema,model} = require('mongoose');

let userScheme = new Schema({
    id: Number,
    login: String,
    password: String,
    name: String,
    img: String,
    autoBet: Number,
    balance: Number,
    history: [{
        game: String,
        result: Number,
        playerId: Number
    }]
});

module.exports = model('Users', userScheme)