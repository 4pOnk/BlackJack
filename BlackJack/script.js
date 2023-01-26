let socket = io();


let winW = document.body.clientWidth;
let winH = document.body.clientHeight;
//onResize
window.addEventListener('resize', () => {
    winW = document.body.clientWidth;
    winH = document.body.clientHeight;
}, false)
let playerCards = document.querySelectorAll('.playerCards');
let dealerCards = document.querySelector('.dealerCards');
let dealerNeedle = document.querySelector('.dealerCards');
let saddleBtns = document.querySelectorAll('.saddleBtn');
let dealerSaddleBtn = document.querySelector('.dealerSaddle');
let loadingRounds = document.querySelectorAll('.loadingOverlay');
let gamePlayBlock = document.querySelector('.gameplayBlock');
let deck = document.querySelector('.deck');
let dealerSumBlock = document.querySelector('.dealerSum');
let animationChipsBlock = document.querySelector('.animationChips');
let playerImages = document.querySelectorAll('.playerImage');
let dealerImage = document.querySelector('.dealerImage');

let __game = {};
let amIDealer = false;
let inGame = false;
let firstDraw = true;

let generateCardNode = (card) => {
    let cardEl = document.createElement('div');
    cardEl.classList.add('card');
    cardEl.style.backgroundImage = "url(BlackJack/img/"+ card.bg +")";

    return cardEl;
}
let countDealerHand = () => {
    player = __game.dealer;
    let values = Array.from(player.hand, el => el.value);
    while (values.reduce((a, b) => a + b, 0) > 21 && values.indexOf(11) !== -1) {
        values.splice(values.indexOf(11), 1, 1);
    }
    //Сумма карт в руке
    return values.reduce((a, b) => a + b, 0);
}
function getCookie ( cookie_name ) {
    let results = document.cookie.match ( '(^|;) ?' + cookie_name + '=([^;]*)(;|$)' );
    if ( results ) return ( unescape ( results[2] ) );
    else return null;
}

let __player = JSON.parse(decodeURI(getCookie("user")));

let updateUserData = () => {
    document.querySelector('.userLogo').style.backgroundImage = `url("BlackJack/img/${__player.img}")`;
    document.querySelectorAll('.userName')[0].innerHTML = __player.name;
    document.querySelectorAll('.userName')[1].innerHTML = __player.name;
    document.querySelector('.playerBalance').innerHTML = __player.balance;
    __game.players.forEach(player => {
        if(player.id === __player.id){
            let betStr = player.bet.toString();
            let bet = player.bet;
            document.querySelector('.currentBetData').innerHTML = player.bet;

            let subRus = 'САБОК';
            if(betStr.length === 2 && betStr[0] === '1')
                subRus = "САБОК";
            else if(bet % 10 === 1)
                subRus = "САБКА";
            else if(bet % 10 === 2 || bet % 10 === 3 || bet % 10 === 4)
                subRus = "САБКИ";

            document.querySelector('.currentBetDataCount').innerHTML = subRus;

        }
    })
}


//ANIMATIONS
let chipAnimation = (action, saddle, lost) => {
    let startRoundPos;
    let endRoundPos;
    if(action === 'lost') {
        startRoundPos = playerImages[saddle - 1].getBoundingClientRect();
        endRoundPos = document.querySelector('.dealerImage').getBoundingClientRect();
    }else{
        startRoundPos = document.querySelector('.dealerImage').getBoundingClientRect();
        endRoundPos = playerImages[saddle - 1].getBoundingClientRect();
    }

    console.log(action, saddle, lost)

    for(let i = 1; i <= lost; i++){
        let animChip = document.createElement('div');
        animChip.classList.add('animChip');
        animChip.style.top = (startRoundPos.top + startRoundPos.height / 2) / winW * 100 - 1 + 'vw';
        animChip.style.left = (startRoundPos.left + startRoundPos.width / 2) / winW * 100 - 1 + 'vw';
        animationChipsBlock.append(animChip);

        setTimeout(() => {
            animChip.style.top = (endRoundPos.top + endRoundPos.height / 2) / winW * 100 - 1 + 'vw';
            animChip.style.left = (endRoundPos.left + endRoundPos.width / 2) / winW * 100 - 1 + 'vw';
            setTimeout(() => animChip.remove(), 1000)
        }, 1000 / lost * i)
    }
}

let drawGame = (game = __game, players = []) => {

    __game = game;
    if(players. length !== 0){
        players.forEach(player => {
            if (player.id === __player.id) {
                document.cookie = "user=" + encodeURI(JSON.stringify(player)) + "; path=/";
                __player = player
            }
        })
    }


    updateUserData();

    document.querySelectorAll('.playerCards').forEach(hand => hand.innerHTML = "");
    document.querySelectorAll('.dealerCards').forEach(hand => hand.innerHTML = "");

    //PLAYER
    game.players.forEach(player => {
        let hand = playerCards[player.saddle - 1];
        let values = Array.from(player.hand, el => el.value);
        saddleBtns[player.saddle - 1].style.display = 'none';
        if(player.id === __player.id){
            inGame = true;
        }

        //CARDS
        player.hand.forEach(card => {
            hand.append(generateCardNode(card))
        })

        //SUM
        let sumBlock = document.querySelectorAll('.cardsSum')[player.saddle - 1];
        sumBlock.style.display = 'flex';
        while (values.reduce((a, b) => a + b, 0) > 21 && values.indexOf(11) !== -1){
            values.splice(values.indexOf(11), 1, 1);
        }
        let sum = values.reduce((a, b) => a + b, 0);
        sumBlock.children[0].innerHTML = sum;
        if(sum === 0)sumBlock.style.display = 'none';
        else if(sum === 21)sumBlock.style.backgroundColor = '#1f6800';
        else if(sum > 21)sumBlock.style.backgroundColor = '#600000';

        //BET
        let betBlock = document.querySelectorAll('.center')[player.saddle - 1];
        betBlock.style.display = 'block';
        betBlock.children[1].children[1].innerHTML = player.bet;

        //IMAGE
        let playerImage = document.querySelectorAll('.playerImage')[player.saddle - 1];
        playerImage.style.backgroundImage = "url(BlackJack/img/"+ player.img +")";
        playerImage.style.opacity = '1';

        //USERNAME
        let userName = document.querySelectorAll('.playerName')[player.saddle - 1];
        userName.innerHTML = player.name;
        userName.style.opacity = '1';

        //GAMEPLAY
        if(__player.id === player.id && player.saddle === __game.turn && __game.stage === 'choice'){
            gamePlayBlock.style.transform = 'translateX(-50%)';
        }
        if(__game.stage === 'dealersGame'){
            gamePlayBlock.style.transform = 'translate(-50%, 100%)';
        }
    })

    //DEALER

    if(Object.keys(game.dealer).length !== 0){

        if(game.dealer.id === __player.id){
            inGame = true;
            amIDealer = true;
        }

        document.querySelector('.dealerInfo').style.display = 'flex';

        //CARDS
        let dealerHand = document.querySelector('.dealerCards');
        game.dealer.hand.forEach((card, id) => {
            let cardEl = document.createElement('div');
            cardEl.classList.add('card');
            if (game.stage === 'dealersGame')
                cardEl.style.backgroundImage = "url(BlackJack/img/" + card.bg + ")";
            else if (game.turn !== 0 && id === 0)
                cardEl.style.backgroundImage = "url(BlackJack/img/" + card.bg + ")";
            dealerHand.append(cardEl)
        })

        //IMAGE
        let dealerImage = document.querySelector('body > div.dealerBlock > div.dealerInfo > div');
        dealerImage.style.backgroundImage = "url(BlackJack/img/" + game.dealer.img + ")";

        //USERNAME
        let userName = document.querySelector('body > div.dealerBlock > div.dealerInfo > span');
        userName.innerHTML = game.dealer.name;
        dealerSaddleBtn.style.display = 'none';

        //SUM
        if(__game.stage === 'dealersGame'){
            if(__game.dealer.hand.length === 2)
                dealerSumBlock.style.display = 'flex';
            else if(countDealerHand() === 21)dealerSumBlock.style.backgroundColor = '#1f6800';
            else if(countDealerHand() > 21)dealerSumBlock.style.backgroundColor = '#600000';
            document.querySelector('.dealerSum span').innerHTML = countDealerHand();
        }
        if(__game.dealer.hand.length === 0)
            dealerSumBlock.style.display = 'none';

    }else {
        dealerSaddleBtn.style.display = 'block';
    }


    //Рофлан условия
    if(inGame){
        saddleBtns.forEach(saddleBtn => saddleBtn.style.display = 'none')
        dealerSaddleBtn.style.display = 'none';
    }
    else{
        saddleBtns.forEach(saddleBtn => saddleBtn.style.display = 'block')
        if(Object.keys(game.dealer).length === 0) dealerSaddleBtn.style.display = 'block';
    }
    game.players.forEach(player => {
        saddleBtns[player.saddle - 1].style.display = 'none';
    })


}


//Отрисовка всей игры
socket.on('drawGame', (game, players = []) => {
    drawGame(game, players);
    __game = game;
})
//Добавление карты с анимацией
socket.on('addCard', (playerSaddle, card, game) => {
    __game = game;
    let cardNode = document.createElement('div');
    cardNode.classList.add('card');
    cardNode.style.zIndex = '1'
    let scene = document.createElement('div');
    scene.innerHTML = `
      <div class="cardFlip">
        <div class="card card__face card__face--front"></div>
        <div class="card card__face card__face--back" style="background-image: url('BlackJack/img/${card.bg}')"></div>
      </div>`
    scene.classList.add('scene')
    if(playerSaddle === -1 && __game.dealer.hand.length === 1)scene.style.marginLeft = '0';
    if(playerSaddle !== -1 && playerCards[playerSaddle - 1].children.length === 0)scene.style.marginLeft = '0';
    if(playerSaddle !== -1)playerCards[playerSaddle - 1].append(scene);
    else if(__game.dealer.hand.length === 2 && __game.stage === 'distribution')dealerCards.append(cardNode);
    else dealerCards.append(scene);
    setTimeout(() => {
        scene.children[0].classList.add('is-flipped');
        if(__game.stage === 'choice' || game.stage === 'dealersGame')
        setTimeout(() => {
            drawGame()
        }, 1000)
    }, 100)
})
//Присоединение к игре за игрока
saddleBtns.forEach((saddleBtn, id) => {
    saddleBtn.addEventListener('click', () => {
        socket.emit('addPlayer', id + 1, __player);
    })
})
//Диллер поднял карту
let card;
socket.on('cardUp', () => {
    card = document.createElement('div');
    let deckPos = deck.getBoundingClientRect();
    card.classList.add('card');
    card.classList.add('movingCard');
    document.body.append(card);

    card.style.left = deckPos.left / winW * 100 + 1 + 'vw';
    card.style.top = 2 + 'vh';
})
//Диллер двигает карту
socket.on('cardMove', (x,y) => {
    card.style.left = x;
    card.style.top = y;
})
//Диллер поставил карту
socket.on('cardDown', () => {
    card.remove();
})
//Присоединение к игре за диллера
document.querySelector(".dealerSaddleBtn").addEventListener('click', () => {
    socket.emit('addDealer', __player);
})
//Раздача карт за диллера
deck.addEventListener('mousedown', (e1) => {
    if(__player.id === __game.dealer.id && __game.players.length >= 1){

        let card = document.createElement('div');
        let deckPos = deck.getBoundingClientRect();
        socket.emit('cardUp');

        card.classList.add('card');
        card.classList.add('movingCard');
        document.body.append(card);

        card.style.left = deckPos.left / winW * 100 + 1 + 'vw';
        card.style.top = 2 + 'vh';

        let startX = e1.clientX / winW * 100 - (deckPos.left / winW * 100 + 1);
        let startY = e1.clientY / winH * 100 - 2;

        let needyPlayers = [];
        let needyDealer = false;
        __game.players.forEach(player => {
            if((player.hand.length < 2 || player.needCard) && !player.waiting){
                needyPlayers.push(player.saddle)
                playerCards[player.saddle - 1].style.border = '.2vw solid';
                playerCards[player.saddle - 1].style.transform = 'translateY(calc(-100% - 1.8vw));';
            }
        })

        //console.log(countDealerHand())
        if(__game.dealer.hand.length < 2 || (__game.stage === 'dealersGame' && countDealerHand() < 17)){
            needyDealer = true;
            dealerNeedle.style.border = '.2vw solid';
            dealerNeedle.style.transform = 'translateY(-3.2vw);';
        }


        let mouseMove = (e) => {
            card.style.left = e.clientX / winW * 100 - startX + 'vw';
            card.style.top = e.clientY / winH * 100 - startY + 'vh';
            socket.emit('cardMove', e.clientX / winW * 100 - startX + 'vw', e.clientY / winH * 100 - startY + 'vh')
        }
        document.addEventListener('mousemove', mouseMove)

        //Коллизия
        document.addEventListener('mouseup', () => {
            needyPlayers.forEach(handId => {
                let hand = playerCards[handId - 1]
                let handPos = hand.getBoundingClientRect();
                let cardPos = card.getBoundingClientRect();
                if(cardPos.x + cardPos.width > handPos.x && cardPos.x < handPos.x + handPos.width && cardPos.y + cardPos.height > handPos.y && cardPos.y < handPos.y + handPos.height){
                    socket.emit("addCard", handId);
                }
            })

            if(needyDealer){
                let hand = dealerNeedle;
                let handPos = hand.getBoundingClientRect();
                let cardPos = card.getBoundingClientRect();
                if(cardPos.x + cardPos.width > handPos.x && cardPos.x < handPos.x + handPos.width && cardPos.y + cardPos.height > handPos.y && cardPos.y < handPos.y + handPos.height){
                    socket.emit("addCard", "dealer");
                }
            }

            card.remove();
            playerCards.forEach(hand => hand.style.border = 'none');
            dealerNeedle.style.border = 'none';
            document.removeEventListener('mousemove', mouseMove)
            socket.emit('cardDown')
        })

    }
})
//Анимация загрузки
let animation;
let timeOut;
socket.on('loadingAnimation', (game) => {
    loadingRounds.forEach(round => {
        round.style.backgroundPositionY = 5.5 + 'vw';
    })
    clearInterval(animation);
    clearTimeout(timeOut);
    __game = game;
    let playerInQueueId;
    __game.players.forEach((player, id) => {
        if(player.saddle === __game.turn){
            playerInQueueId = id;
        }
    })
    let localTimer = 0;
    animation = setInterval(() => {
        localTimer++;
        loadingRounds[__game.turn - 1].style.backgroundPositionY = 5.5 - ((localTimer / 10) / 100).toFixed(2) * 5.5 + 'vw';
    }, 10)
    timeOut = setTimeout(() => {
        loadingRounds[__game.turn - 1].style.backgroundPositionY = 5.5 + 'vw';
        clearInterval(animation);
    }, 10000);
    gamePlayBlock.style.transform = 'translate(-50%, 100%)';
    if(__game.players[playerInQueueId].id === __player.id){
        gamePlayBlock.style.transform = 'translateX(-50%)';
    }
})
socket.on('stopAnimation', () => {
    loadingRounds.forEach(round => {
        round.style.backgroundPositionY = 5.5 + 'vw';
    })
    clearInterval(animation);
    clearTimeout(timeOut);
})
//Еще карту
document.querySelector('.more').addEventListener('click', () => {
    socket.emit('more')
})
socket.on('more', (game) => {
    __game = game;
    if(__game.dealer.id === __player.id) {
        playerCards[__game.turn - 1].style.border = '.5vw solid';
        playerCards[__game.turn - 1].style.transform = 'translateY(calc(-100% - 2vw));';
    }
})
//Хватит
document.querySelector('.stop').addEventListener('click', () => {
    socket.emit('stop')
})

//Удвоить
document.querySelector('.double').addEventListener('click', () => {
    socket.emit('double')
})

//Сдаться
document.querySelector('.giveUp').addEventListener('click', () => {
    socket.emit('giveUp')
})

//Вскрыть карту диллера
socket.on('openDealersCard', (game) => {
    __game = game;
    if(dealerCards.children.length > 2)
        dealerCards.children[1].remove();
    card = game.dealer.hand[1];
    let scene = document.createElement('div');
    scene.innerHTML = `
      <div class="cardFlip">
        <div class="card card__face card__face--front"></div>
        <div class="card card__face card__face--back" style="background-image: url('BlackJack/img/${card.bg}')"></div>
      </div>`
    scene.classList.add('scene');
    dealerCards.append(scene);
    setTimeout(() => {
        scene.children[0].classList.add('is-flipped');
            setTimeout(() => {
                drawGame(game)
            }, 1000)
    }, 100)
})

//Анимация победы
socket.on('winAnimation', (saddle, bet) => {chipAnimation('win', saddle, bet)});
//Анимация проигрыша
socket.on('lostAnimation', (saddle, bet) => {chipAnimation('lost', saddle, bet)});
