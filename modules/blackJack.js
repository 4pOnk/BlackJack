const {server} = require('../server');
const { Server } = require("socket.io");
const io = new Server(server);
const Users = require('../schemes/userScheme');


module.exports = () => {
    let generateCard = () => {
        let num = Math.floor(Math.random() * 52 + 1);
        let card_num = Math.ceil(num / 4);
        let card_suit = num % 4 + 1;
        return {
            num: card_num,
            suit: card_suit,
            value: card_num >= 10 ? 10 : card_num === 1 ? 11 : card_num,
            bg: card_num + '_' + card_suit + '.svg'
        };
    }

    let game = {
        id: 1,
        dealer: {},
        players: [],
        stage: "pause", //pause, distribution, choice, dealersGame
        turn: 1,
    }

    let countHand = (saddle => {
        let sum;
        game.players.forEach(player => {
            if (player.saddle === saddle) {
                let values = Array.from(player.hand, el => el.value);
                while (values.reduce((a, b) => a + b, 0) > 21 && values.indexOf(11) !== -1) {
                    values.splice(values.indexOf(11), 1, 1);
                }
                //Сумма карт в руке
                sum = values.reduce((a, b) => a + b, 0);
            }
        })
        return sum
    })
    let countDealerHand = () => {
        player = game.dealer;
        let values = Array.from(player.hand, el => el.value);
        while (values.reduce((a, b) => a + b, 0) > 21 && values.indexOf(11) !== -1) {
            values.splice(values.indexOf(11), 1, 1);
        }
        //Сумма карт в руке
        return values.reduce((a, b) => a + b, 0);
    }

    let breakTimeOut;

    io.on('connection', (socket) => {
        //functions
        let nextMove = () => {
            clearTimeout(breakTimeOut);
            if (game.stage === 'choice')
                breakTimeOut = setTimeout(() => {
                    io.emit('stopAnimation', game);
                    nextMove();
                }, 10000);
            let playersArr = game.players;
            playersArr = playersArr.filter(player => player.inGame);
            let saddles = Array.from(playersArr, (el => el.saddle));
            saddles = saddles.sort();
            if(saddles.length === 0){
                resultGame();
                return 0;
            }
            if (game.turn !== saddles[saddles.length - 1]) {
                let nextSaddle = saddles[saddles.indexOf(game.turn) + 1];
                if (saddles.indexOf(game.turn) === -1) {
                    for (let i = 0; i < saddles.length; i++) {
                        if (saddles[i] > game.turn) {
                            nextSaddle = saddles[i];
                            break;
                        }
                    }
                }
                game.turn = nextSaddle;
                if (countHand(nextSaddle) === 21) {
                    nextMove();
                    return 0;
                }
                io.emit('loadingAnimation', game)
            }
            //Конец раздачи
            else {
                if (game.stage !== "dealersGame") {
                    game.stage = 'dealersGame';
                    io.emit('openDealersCard', game);
                    if (countDealerHand() >= 17) {
                        resultGame();
                    }
                }
            }
        }
        let resultGame = () => {
            let dealersSum = countDealerHand();
            let playersResult = game.players.map(player => {
                if (!player.inGame) return 'notInGame';
                if (player.surrended) return 'surrended';
                let playersSum = countHand(player.saddle);
                if (playersSum > 21) return 'preLost';
                if (dealersSum > 21) return 'win';
                if (playersSum === 21 && player.hand.length === 2 && !(dealersSum === 21 && game.dealer.hand.length === 2)) return 'blackJack';
                if (playersSum > dealersSum) return 'win';
                if (playersSum < dealersSum) return 'lost';
                return 'draw';
            });

            playersResult.forEach((res, id) => {
                //СЧИТАЕМ РЕЗУЛЬТАТЫ
                let player = game.players[id];
                if (res === 'win') {
                    Users.updateOne({id: player.id}, {balance: player.balance + player.bet}, (err, res) => {
                        if(err) console.log(err);
                    })
                    io.emit('winAnimation', game.players[id].saddle, game.players[id].bet);
                }
                if (res === 'lost'){
                    io.emit('lostAnimation', game.players[id].saddle, game.players[id].bet);
                    Users.updateOne({id: player.id}, {balance: player.balance - player.bet}, (err, res) => {
                        if(err) console.log(err);
                    })
                }
                if (res === 'blackJack') {
                    io.emit('winAnimation', game.players[id].saddle, Math.floor(game.players[id].bet));
                    Users.updateOne({id: player.id}, {balance: player.balance + player.bet / 2}, (err, res) => {
                        if(err) console.log(err);
                    })
                }
                if (res === 'surrended') {
                    io.emit('lostAnimation', game.players[id].saddle, Math.floor(game.players[id].bet));
                    Users.updateOne({id: player.id}, {balance: player.balance - player.bet / 2}, (err, res) => {
                        if(err) console.log(err);
                    })
                }
            })
            //ЧИСТИМ ИГРУ

            game.players = game.players.map(player => {
                return {autoBet: player.autoBet,
                    balance: player.balance,
                    bet: player.bet,
                    hand: [],
                    history: player.history,
                    id: player.id,
                    img: player.img,
                    inGame: true,
                    name: player.name,
                    saddle: player.saddle,
                }
            })
            game.stage = 'pause';
            game.dealer.hand = [];

            //ОТРПРАВЛЯЕМ ДАННЫЕ
            setTimeout(() => {
                Users.find({}, (err, res) => {
                    io.emit('drawGame', game, res);
                })
            }, 3000)
        }


        socket.emit('drawGame', game);

        socket.on('drawGame', () => {
            socket.emit('drawGame', game);
        })
        socket.on('addPlayer', (saddlePos, player) => {
            let newPlayer = {
                ...player,
                saddle: saddlePos,
                hand: [],
                bet: player.autoBet,
                autoBet: 1,
                inGame: game.stage === 'pause'
            }
            if (game.stage !== 'pause') {
                newPlayer.waiting = true;
            }
            game.players.push(newPlayer)
            io.emit('drawGame', game)
        })
        socket.on('addDealer', (player) => {
            game.dealer = {
                ...player,
                hand: [],
            }
            io.emit('drawGame', game)
        })
        socket.on('addCard', (handId) => {

            let playerSaddle = handId;
            let card = generateCard();

            if (game.stage === 'pause') game.stage = 'distribution'

            if (handId !== 'dealer') {
                game.players.forEach((player, id) => {
                    //Игрок, которому дали карту
                    if (player.saddle === playerSaddle) {
                        game.players[id].hand.push(card);

                        if (player.lastCard) {
                            player.lastCard = false;
                            game.players[id].needCard = false;
                            nextMove();
                            return 0;
                        }

                        let values = Array.from(player.hand, el => el.value);
                        while (values.reduce((a, b) => a + b, 0) > 21 && values.indexOf(11) !== -1) {
                            values.splice(values.indexOf(11), 1, 1);
                        }
                        //Сумма карт в руке
                        let sum = values.reduce((a, b) => a + b, 0);


                        if (player.needCard) {
                            game.players[id].needCard = false;
                            socket.emit('drawGame')
                        }
                        if (sum >= 21 && game.stage === 'choice') {
                            nextMove();
                            if (sum > 21) io.emit('lostAnimation', game.players[id].saddle, game.players[id].bet);
                        } else if (game.stage === 'choice') io.emit('loadingAnimation', game);
                    }
                })
                io.emit('addCard', playerSaddle, card, game);
            } else {
                game.dealer.hand.push(card);
                io.emit('addCard', -1, card, game);
            }

            let fullCards = true;
            if (Object.keys(game.dealer).length !== 0) {
                if (game.dealer.hand.length !== 2) fullCards = false;
            }
            game.players.filter(player => player.inGame).forEach(player => {
                if (player.hand.length !== 2) fullCards = false;
            })
            //Переход с раздачи на саму игру
            if (fullCards && game.stage === 'distribution') {
                game.stage = 'choice';
                let min = 6;
                let playerId;
                game.players.forEach((player, id) => {
                    if (player.saddle < min) {
                        min = player.saddle;
                        playerId = id;
                    }
                })
                game.turn = min;

                if (countHand(min) !== 21) {

                    io.emit('loadingAnimation', game);

                    breakTimeOut = setTimeout(() => {
                        io.emit('stopAnimation', game);
                        nextMove();
                    }, 10000)

                    io.emit('drawGame', game);

                } else {
                    nextMove();
                }
            }
            //Проверка, не закончилась ли игра
            if (game.stage === 'dealersGame' && countDealerHand() >= 17) {
                resultGame();
            }

        });
        socket.on('cardUp', () => {
            socket.broadcast.emit('cardUp');
        })
        socket.on('cardMove', (x, y) => {
            socket.broadcast.emit('cardMove', x, y);
        })
        socket.on('cardDown', (x, y) => {
            socket.broadcast.emit('cardDown');
        })
        socket.on('more', () => {
            clearTimeout(breakTimeOut);
            game.players.forEach((player, id) => {
                if (player.saddle === game.turn) game.players[id].needCard = true;
            })
            io.emit('more', game);
            io.emit('stopAnimation', game);
        })
        socket.on('stop', () => {
            clearTimeout(breakTimeOut);
            io.emit('stopAnimation', game);
            nextMove();
        })
        socket.on('double', () => {
            clearTimeout(breakTimeOut);
            game.players.forEach((player, id) => {
                if (player.saddle === game.turn) {
                    game.players[id].needCard = true;
                    game.players[id].lastCard = true;
                    game.players[id].bet *= 2;
                }
            })
            io.emit('drawGame', game);
            io.emit('more', game);
            io.emit('stopAnimation', game);
        })
        socket.on('giveUp', () => {
            clearTimeout(breakTimeOut);
            io.emit('stopAnimation', game);
            game.players.forEach((player, id) => {
                if (player.saddle === game.turn) {
                    game.players[id].inGame = false;
                    game.players[id].surrended = true;
                    io.emit('winAnimation', game.turn, Math.ceil(game.players[id].bet));
                }
            })
            nextMove();
        })

    });
}