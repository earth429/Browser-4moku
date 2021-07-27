(function init() {
    const P1 = 'X';
    const P2 = 'O';
    let player;
    let game;

    const hostname = '127.0.0.1';
    // const hostname = '192.168.144.243';
    const port = 3000;

    window.onload = function () {
        const socket = io.connect(`http://${hostname}:${port}`);
        class Player {
            constructor(name, type) {
                this.name = name;
                this.type = type;
                this.currentTurn = true;
                this.playsArr = 0;
            }

            /**
             *     33825               4680  
             *        \               /
             *          1 |   2 |   4 |   8  = 15
             *       -----+-----+-----+-----
             *         16 |  32 |  64 | 128  = 240 
             *       -----+-----+-----+-----
             *         64 | 128 | 256  = 448 = 3840
             *       -----+-----+-----+-----
             *        4096| 8192|16384|32768 = 61440
             *       =======================
             *        4369  8738 17476 34952  
             *
             */
            static get wins() {
                return [15, 240, 3840, 61440, 4369, 8738, 17476, 34952, 4680, 33825];
            }

            // Set the bit of the move played by the player
            // tileValue - Bitmask used to set the recently played move.
            updatePlaysArr(tileValue) {
                this.playsArr += tileValue;
            }

            getPlaysArr() {
                return this.playsArr;
            }

            // Set the currentTurn for player to turn and update UI to reflect the same.
            setCurrentTurn(turn) {
                this.currentTurn = turn;
                const message = turn ? 'あなたの番です．' : '相手の番を待っています...';
                $('#turn').text(message);
            }

            getPlayerName() {
                return this.name;
            }

            getPlayerType() {
                return this.type;
            }

            getCurrentTurn() {
                return this.currentTurn;
            }
        }

        // roomId Id of the room in which the game is running on the server.
        class Game {
            constructor(roomId) {
                this.roomId = roomId;
                this.board = [];
                this.moves = 0;
            }

            // Create the Game board by attaching event listeners to the buttons.
            createGameBoard() {
                function tileClickHandler() {
                    const row = parseInt(this.id.split('_')[1][0], 10);
                    const col = parseInt(this.id.split('_')[1][1], 10);
                    if (!player.getCurrentTurn() || !game) {
                        alert('相手の番です！');
                        return;
                    }

                    // Update board after your turn.
                    game.playTurn(this);
                    game.updateBoard(player.getPlayerType(), row, col, this.id);

                    player.setCurrentTurn(false);
                    player.updatePlaysArr(1 << ((row * 4) + col));

                    game.checkWinner();
                }

                for (let i = 0; i < 4; i++) {
                    this.board.push(['', '', '']);
                    for (let j = 0; j < 4; j++) {
                        $(`#button_${i}${j}`).on('click', tileClickHandler);
                    }
                }
            }
            // Remove the menu from DOM, display the gameboard and greet the player.
            displayBoard(message) {
                $('.menu').css('display', 'none');
                $('.gameBoard').css('display', 'block');
                $('#userHello').html(message);
                this.createGameBoard();
            }
            /**
             * Update game board UI
             *
             * @param {string} type Type of player(X or O)
             * @param {int} row Row in which move was played
             * @param {int} col Col in which move was played
             * @param {string} tile Id of the the that was clicked
             */
            updateBoard(type, row, col, tile) {
                $(`#${tile}`).text(type).prop('disabled', true);
                this.board[row][col] = type;
                this.moves++;
            }

            getRoomId() {
                return this.roomId;
            }

            // Send an update to the opponent to update their UI's tile
            playTurn(tile) {
                const clickedTile = $(tile).attr('id');

                // Emit an event to update other player that you've played your turn.
                socket.emit('playTurn', {
                    tile: clickedTile,
                    room: this.getRoomId(),
                });
            }

            checkWinner() {
                const currentPlayerPositions = player.getPlaysArr();

                Player.wins.forEach((winningPosition) => {
                    if ((winningPosition & currentPlayerPositions) === winningPosition) {
                        game.announceWinner();
                    }
                });

                const tieMessage = '引き分けです．';
                if (this.checkTie()) {
                    socket.emit('gameEnded', {
                        room: this.getRoomId(),
                        message: tieMessage,
                    });
                    alert(tieMessage);
                    location.reload();
                }
            }

            checkTie() {
                return this.moves >= 16;
            }

            // Announce the winner if the current client has won.
            // Broadcast this on the room to let the opponent know.
            announceWinner() {
                const message = `${player.getPlayerName()}の勝ち!`;
                socket.emit('gameEnded', {
                    room: this.getRoomId(),
                    message,
                });
                alert(message);
                location.reload();
            }

            // End the game if the other player won.
            endGame(message) {
                alert(message);
                location.reload();
            }
        }


        function getUrlParameter(name) {
            name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
            const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
            const results = regex.exec(location.search);
            return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
        }

        $(document).ready(() => {
            const roomID = getUrlParameter('roomId');
            if (roomID) {
                socket.emit('joinGame', {
                    name: 'player2',
                    room: roomID,
                });
                player = new Player('player2', P2);
            }
        });

        // Create a new game. Emit newGame event.
        $('#new').on('click', () => {
            $('#new').hide();
            const name = 'player1';
            socket.emit('createGame', { name });
            player = new Player(name, P1);
        });
    

        // New Game created by current client. Update the UI and create new Game var.
        socket.on('newGame', (data) => {
            const message = `あなたは${data.name}で先行です．利用するマークはXです．対戦相手はこのリンクにアクセスしてください: ${data.url}`;

            // Create game for player 1
            game = new Game(data.room);
            game.displayBoard(message);
        });

        /**
         * If player creates the game, he'll be P1(X) and has the first turn.
         * This event is received when opponent connects to the room.
         */
        socket.on('player1', (data) => {
            player.setCurrentTurn(true);
        });

        /**
         * Joined the game, so player is P2(O).
         * This event is received when P2 successfully joins the game room.
         */
        socket.on('player2', (data) => {
            $('#new').hide();
            const message = `あなたは${data.name}で後攻です．利用するマークはOです．`;

            // Create game for player 2
            game = new Game(data.room);
            game.displayBoard(message);
            player.setCurrentTurn(false);
        });

        /**
         * Opponent played his turn. Update UI.
         * Allow the current player to play now.
         */
        socket.on('turnPlayed', (data) => {
            const row = data.tile.split('_')[1][0];
            const col = data.tile.split('_')[1][1];
            const opponentType = player.getPlayerType() === P1 ? P2 : P1;

            game.updateBoard(opponentType, row, col, data.tile);
            player.setCurrentTurn(true);
        });

        // If the other player wins, this event is received. Notify user game has ended.
        socket.on('gameEnd', (data) => {
            game.endGame(data.message);
            socket.leave(data.room);
        });

        /**
         * End the game on any err event.
         */
        socket.on('err', (data) => {
            if (game) {
                game.endGame(data.message);
            }
        });
    }
}());