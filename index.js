const express = require('express'),
    {app, server, mongoose} = require('./server'),
    urlencodedParser = express.urlencoded({extended: false}),
    { Server } = require("socket.io"),
    io = new Server(server),
    Users = require('./schemes/userScheme'),
    cookieParser = require('cookie-parser')

const blackJack = require('./modules/blackJack')



const host = '127.0.0.1';
const port = 3000;

app.use(express.static(__dirname + '/'));
app.use(cookieParser('secret key'))


//LOGIN
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/LoginPage/login.html');
});
app.post("/login", urlencodedParser, function (request, response) {
    if(!request.body) return response.sendStatus(400);

    Users.find({login: request.body.login, password: request.body.password}, (err, res) => {
        if(res.length === 1){
            response.cookie('user', encodeURI(JSON.stringify(res[0])),{
                path: "/"
            })
            response.redirect('/');
        }else{
            response.redirect('/login');
        }
    })

});

//REGISTRATION
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/RegisterPage/register.html');
});
app.post("/register", urlencodedParser, function (request, response) {
    if(!request.body) return response.sendStatus(400);

    Users.find({login: request.body.login, password: request.body.password}, (err, res) => {
        if(res.length === 0){
            let userObj = {
                id: new Date().getTime(),
                login: request.body.login,
                password: request.body.password,
                name: request.body.name,
                img: 'roflan2.jpg',
                autoBet: 1,
                balance: 0,
                history: []
            }
            const user = new Users(userObj);
            user.save();

            response.cookie('user', encodeURI(JSON.stringify(userObj)),{
                path: "/"
            })
            response.redirect('/');
        }
    })

});

app.get("/slots/alphabet", (req, res) => {
    res.sendFile(__dirname + '/Slots/Alphabet/index.html');
})

app.get('/', (req, res) => {
    if(req.cookies.user === undefined)res.redirect('/login')
    res.sendFile(__dirname + '/BlackJack/index.html');
});



blackJack();


server.listen(3000, () => {
    console.log('listening on *:3000');
});