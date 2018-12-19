(function(){


    if (window.cordova) {
        return;
    }

    !function(){var t=window.Cocoon||(window.Cocoon={});window.cordova&&"undefined"!=typeof module&&(module.exports=t),t.version="1.0",t.extend=function(t,o){var e=t.prototype,n=function(){};n.prototype=o.prototype,t.prototype=new n,t.superclass=o.prototype,t.prototype.constructor=t,o.prototype.constructor===Object.prototype.constructor&&(o.prototype.constructor=o);for(var r in e)e.hasOwnProperty(r)&&(t.prototype[r]=e[r])},t.exec=function(t,o,e,n,r){window.cordova?window.cordova.exec(n,r,t,o,e):console.error("window.cordova not found")},t.define=function(t,o,e){for(var n="Cocoon."==t.substring(0,7)?t.substr(7):t,r=window.Cocoon,i=n.split("."),s=r,a=0;a<i.length;a++){var p=i[a];if(console.log(s[p]?"Updated namespace: - "+t:"Created namespace: "+t),s=s[p]=a==i.length-1?o(s[p]||{}):{},!s)throw"Unable to create class "+t}return arguments.length<2&&(e=!0),e&&"undefined"!=typeof module&&(module.exports=s),!0},t.Signal=function(){this.signals={}},t.Signal.prototype={on:function(t,o){if(!t||!o)throw new Error("Can't create signal "+(t||""));var e=this.signals[t];e||(e=[],this.signals[t]=e),e.push(o)},emit:function(t,o,e){var n=this.signals[t];if(n)for(var r=0;r<n.length;++r){var i=n[r];o&&(i=i[o]),i&&i.apply(null,e||[])}},remove:function(t,o){var e=this.signals[t];if(e)if(o)for(var n=0;n<e.lenght;++n)e[n]===o&&(e.splice(n,1),--n);else e.lenght=0},expose:function(){return this.on.bind(this)}},t.PlatformType={ANDROID:"android",IOS:"ios",AMAZON:"amazon",WINDOWS_PHONE:"wp",BLACKBERRY:"blackberry",OTHER:"other"};var o;t.getPlatform=function(){if(o)return o;var e=navigator.userAgent;return o=navigator.isCocoonJS?/ios/gi.test(e)?t.PlatformType.IOS:t.PlatformType.ANDROID:/(iPad|iPhone|iPod)/g.test(e)?t.PlatformType.IOS:/Kindle/i.test(e)||/Silk/i.test(e)||/KFTT/i.test(e)||/KFOT/i.test(e)||/KFJWA/i.test(e)||/KFJWI/i.test(e)||/KFSOWI/i.test(e)||/KFTHWA/i.test(e)||/KFTHWI/i.test(e)||/KFAPWA/i.test(e)||/KFAPWI/i.test(e)?t.PlatformType.AMAZON:/Android/i.test(e)?t.PlatformType.ANDROID:/BlackBerry/i.test(navigator.userAgent)?t.PlatformType.BLACKBERRY:/IEMobile/i.test(navigator.userAgent)?t.PlatformType.WINDOWS_PHONE:t.PlatformType.OTHER},console.log("Created namespace: Cocoon")}();

    Cocoon.define("Cocoon.Multiplayer" , function(extension){

        extension.MultiplayerService = function(serviceName)
        {
            this.serviceName = serviceName;
            this.serviceSignal = new Cocoon.Signal();
            this.on = this.serviceSignal.expose();
            this.matches = {};
            this.currentMatch = null;

            document.addEventListener('deviceready', function(){
                this.init();
            }.bind(this));
        };


        extension.MultiplayerService.prototype = {

            /**
             * @private
             */
            init: function(){

                var me = this;

                //Invitation listeners
                Cocoon.exec(me.serviceName, "setServiceListener", [], function(params) {

                    var event = params[0];
                    if (event === 'invitationReceived') {
                        me.serviceSignal.emit('invitation', 'received');
                    }
                    else if (event === 'invitationLoaded') {
                        var matchData = params[1];
                        me.serviceSignal.emit('invitation', 'loaded', [me._createMatch(matchData)]);
                    }
                }, function(event, error) {
                    me.serviceSignal.emit('invitation', 'loaded', [null, error]);

                });

                //Match listeners
                Cocoon.exec(me.serviceName, "setMatchListener", [], function(params) {

                    var matchKey = params[0];
                    var eventName = params[1];
                    var match = me.matches[matchKey];
                    if (!match) {
                        return;
                    }

                    if (eventName === 'dataReceived') {
                        var msg = params[2];
                        var playerID = params[3];
                        match.signal.emit('match', eventName, [match, msg, playerID]);
                    }
                    else if (eventName === 'stateChanged') {
                        var playerID = params[2];
                        var state = params[3];
                        match.matchData.expectedPlayerCount = params[4];
                        match.signal.emit('match', eventName, [match, playerID, state]);
                    }
                    else {
                        //connectionWithPlayerFailed or failed
                        match.signal.emit('match', eventName, [match, params[2]]);
                    }
                });
            },


            /**
             * @private
             */
            _createMatch: function(matchData) {
                var match = new Cocoon.Multiplayer.Match(this.serviceName, matchData);
                this.matches[matchData.key] = match;
                this.currentMatch = match;
                return match;
            },

            /**
             * Presents a system View for the matchmaking and creates a new Match.
             * @function findMatch
             * @memberOf Cocoon.Multiplayer
             * @private
             * @param {Cocoon.Multiplayer.MatchRequest} matchRequest The parameters for the match.
             * @param {Function} callback The callback function. It receives the following parameters:
             * - {@link Cocoon.Multiplayer.Match}.
             * - Error.
             */
            findMatch : function(matchRequest, callback)  {
                var me = this;
                callback = callback || function(){};

                Cocoon.exec(this.serviceName, 'findMatch', [matchRequest], function(matchData){
                    callback(me._createMatch(matchData));
                }, function(error) {
                    callback(null, error);
                });
            },

            /**
             * Sends an automatch request to join the authenticated user to a match. It doesn't present a system view while waiting to other players.
             * @function findAutoMatch
             * @memberOf Cocoon.Multiplayer
             * @private
             * @param  {Cocoon.Multiplayer.MatchRequest} matchRequest The parameters for the match.
             * @param {Function} callback The callback function. It receives the following parameters:
             * - {@link Cocoon.Multiplayer.Match}.
             * - Error.
             */
            findAutoMatch : function(matchRequest, callback) {
                var me = this;
                callback = callback || function(){};

                Cocoon.exec(this.serviceName, 'findAutoMatch', [matchRequest], function(matchData){
                    callback(me._createMatch(matchData));
                }, function(error) {
                    callback(null, error);
                });
            },

            /**
             * Cancels the ongoing automatch request.
             * @function cancelAutoMatch
             * @memberOf Cocoon.Multiplayer
             * @private
             */
            cancelAutoMatch : function() {
                Cocoon.exec(this.serviceName, 'cancelAutoMatch');
            },

            /**
             * Automatically adds players to an ongoing match owned by the user.
             * @function addPlayersToMatch
             * @memberOf Cocoon.Multiplayer
             * @private
             * @param {Cocoon.Multiplayer.MatchRequest} matchRequest The parameters for the match.
             * @param {Cocoon.Multiplayer.Match} matchRequest The match where new players will be added.
             * @param {Function} callback The callback function. Response parameters: error.
             */
            addPlayersToMatch : function(matchRequest, match, callback) {
                callback = callback || function(){};
                Cocoon.exec(this.serviceName, 'addPlayersToMatch', [match.key, matchRequest], function(){
                    callback(null);
                }, function(error){
                    callback(error);
                });
            },

            /**
             * Get the current match reference.
             * @function getMatch
             * @memberOf Cocoon.Multiplayer
             * @private
             * @return {Cocoon.Multiplayer.Match} The current match reference.
             */
            getMatch : function() {
                return this.currentMatch;
            }
        };

        /**
         * This type provides a transmission network between a group of users.
         * The match might be returned before connections have been established between players. At this stage, all the players are in the process of connecting to each other.
         * Always check the getExpectedPlayerCount value before starting a match. When its value reaches zero, all expected players are connected, and your game can begin the match.
         * Do not forget to call the start method of the match when your game is ready to process received messages via onMatchDataReceived listener.
         * @constructor Match
         * @memberOf Cocoon.Multiplayer
         * @param {string} serviceName The name of the native ext object extension property name.
         * @param {object} matchData The match data received from the native service bridge.
         */
        extension.Match = function(serviceName, matchData)
        {

            this.serviceName = serviceName;
            this.matchData = matchData;
            this.signal = new Cocoon.Signal();
            this.on = this.signal.expose();

            /**
             * Allows to listen to events about the restoring process.
             * - The callback 'dataReceived'
             * - The callback 'stateChanged'
             * - The callback 'connectionWithPlayerFailed' allows listening to events called when a netowrk connection with a player fails
             * - The callback 'failed' allows listening to events called when the match fails.
             * @event On restore products callbacks
             * @memberof Cocoon.Multiplayer.Match
             * @example
             * match.on("restore",{
        *  dataReceived: function(match, data, playerId){ ... },
        *  stateChanged: function(match, playerId, connectionState){ ... },
        *  connectionWithPlayerFailed: function(match, playerId, errorMsg){ ... }
        *  failed: function(match, errorMsg){ ... }
        * });
             */
            this.on = this.signal.expose();
        };

        extension.Match.prototype = {

            /**
             * Starts processing received messages. The user must call this method when the game is ready to process messages. Messages received before being prepared are stored and processed later.
             * @function start
             * @memberOf Cocoon.Multiplayer.Match
             */
            start : function() {
                Cocoon.exec(this.serviceName, 'start', [this.matchData.key]);
            },

            /**
             * Transmits data to all players connected to the match. The match queues the data and transmits it when the network becomes available.
             * @function sendDataToAllPlayers
             * @memberOf Cocoon.Multiplayer.Match
             * @param {string} data The data to transmit.
             * @param {Cocoon.Multiplayer.SendDataMode} [sendMode] The optional {@link Cocoon.Multiplayer.SendDataMode} value. The default value is RELIABLE.
             * @return {boolean} TRUE if the data was successfully queued for transmission; FALSE if the match was unable to queue the data.
             */
            sendDataToAllPlayers : function(data, sendMode) {
                Cocoon.exec(this.serviceName, 'sendDataToAllPlayers', [this.matchData.key, data, sendMode]);
            },

            /**
             * Transmits data to a list of connected players. The match queues the data and transmits it when the network becomes available.
             * @function sendData
             * @memberOf Cocoon.Multiplayer.Match
             * @param {string} data The data to transmit
             * @param {array} playerIDs An array containing the identifier strings for the list of players who should receive the data.
             * @param {Cocoon.Multiplayer.SendDataMode} [sendMode] The optional {@link Cocoon.Multiplayer.SendDataMode} value. The default value is RELIABLE.
             * @return {boolean} TRUE if the data was successfully queued for transmission; FALSE if the match was unable to queue the data.
             */
            sendData : function(data, playerIDs,  sendMode) {
                Cocoon.exec(this.serviceName, 'sendData', [this.matchData.key, data, playerIDs, sendMode]);
            },

            /**
             * Disconnects the local player from the match and releases the match. Calling disconnect notifies other players that you have left the match.
             * @function disconnect
             * @memberOf Cocoon.Multiplayer.Match
             */
            disconnect : function() {
                Cocoon.exec(this.serviceName, 'disconnect', [this.matchData.key]);
            },

            /**
             * Requests additional information of the current players in the match.
             * @function requestPlayersInfo
             * @memberOf Cocoon.Multiplayer.Match
             * @param {Function} callback The callback function. Response params: players array and error
             */
            requestPlayersInfo : function(callback) {
                Cocoon.exec(this.serviceName, 'requestPlayersInfo', [this.matchData.key], function(players){
                    var result = [];
                    for (var i = 0; i < players.length; ++i) {
                        var player = players[i];
                        result.push(new Cocoon.Multiplayer.PlayerInfo(player.playerID, player.alias));
                    }
                    callback(result, null);

                }, function(error) {
                    callback(null, error);
                });
            },

            /**
             * Returns the remaining players count who have not yet connected to the match.
             * @function getExpectedPlayerCount
             * @memberOf Cocoon.Multiplayer.Match
             * @return {number} The remaining number of players who have not yet connected to the match.
             */
            getExpectedPlayerCount : function() {
                return this.matchData.expectedPlayerCount;
            },

            /**
             * Returns an array with all the player identifiers taking part in the match.
             * @function getPlayerIDs
             * @memberOf Cocoon.Multiplayer.Match
             * @return {array} The player identifiers for the players in the match.
             */
            getPlayerIDs : function() {
                return this.matchData.playerIDs;
            },

            /**
             * Gets the local playerID taking part in the match.
             * @function getLocalPlayerID
             * @memberOf Cocoon.Multiplayer.Match
             * @return {string} the playerID attached to the match manager.
             */
            getLocalPlayerID : function() {
                return this.matchData.localPlayerID;
            },

        };

        /**
         * This object represents the modes to send data.
         * @memberof Cocoon.Multiplayer
         * @name Cocoon.Multiplayer.SendDataMode
         * @property {object} Cocoon.Multiplayer.SendDataMode - The object itself
         * @property {string} Cocoon.Multiplayer.SendDataMode.RELIABLE The data is sent continuously until it is successfully received by the intended recipients or the connection times out.
         * @property {string} Cocoon.Multiplayer.SendDataMode.UNRELIABLE The data is sent once and is not sent again if a transmission error occurs.
         */
        extension.SendDataMode =  {

            RELIABLE : 0,

            UNRELIABLE : 1
        };

        /**
         * This object represents the connection state of a player.
         * @memberof Cocoon.Multiplayer
         * @name Cocoon.Multiplayer.ConnectionState
         * @property {object} Cocoon.Multiplayer.ConnectionState - The object itself
         * @property {string} Cocoon.Multiplayer.ConnectionState.UNKNOWN The connection is in unknown state.
         * @property {string} Cocoon.Multiplayer.ConnectionState.CONNECTED The connection is in connected state.
         * @property {string} Cocoon.Multiplayer.ConnectionState.DISCONNECTED The connection is in disconnected state.
         */
        extension.ConnectionState = {

            UNKNOWN : 0,

            CONNECTED : 1,

            DISCONNECTED : 2
        };

        /**
         * The object that represents the information of a player inside a multiplayer match.
         * @memberof Cocoon.Multiplayer
         * @name Cocoon.Multiplayer.PlayerInfo
         * @property {object} Cocoon.Multiplayer.PlayerInfo - The object itself
         * @property {string} Cocoon.Multiplayer.PlayerInfo.userID The id of the user.
         * @property {string} Cocoon.Multiplayer.PlayerInfo.userName The name of the user.
         */
        extension.PlayerInfo = function(userID, userName) {
            this.userID = userID;
            this.userName = userName;
        };

        /**
         * This object is used to specify the parameters for a new multiplayer match.
         * @memberof Cocoon.Multiplayer
         * @name Cocoon.Multiplayer.MatchRequest
         * @property {object} Cocoon.Multiplayer.MatchRequest - The object itself
         * @property {number} Cocoon.Multiplayer.MatchRequest.minPlayers The minimum number of players that may join the match.
         * @property {number} Cocoon.Multiplayer.MatchRequest.maxPlayers The maximum number of players that may join the match.
         * @property {array} [Cocoon.Multiplayer.MatchRequest.playersToInvite] Optional list of player identifers for players to invite to the match.
         * @property {number} [Cocoon.Multiplayer.MatchRequest.playerGroup] Optional number identifying a subset of players allowed to join the match.
         * @property {number} [Cocoon.Multiplayer.MatchRequest.playerAttributes] Optional mask that specifies the role that the local player would like to play in the game.
         */
        extension.MatchRequest = function(minPlayers, maxPlayers, playersToInvite, playerGroup, playerAttributes) {

            this.minPlayers = minPlayers || 2;

            this.maxPlayers = maxPlayers || this.minPlayers;

            this.playersToInvite = playersToInvite;

            this.playerGroup = playerGroup;

            this.playerAttributes = playerAttributes;

            return this;
        };

        return extension;
    });

    /*
     * @private
     * @namespace Cocoon.Multiplayer.LoopbackService
     */
    Cocoon.define("Cocoon.Multiplayer" , function(extension){

        var loopbackServices = [];
        var indexCounter = 0;
        var matchServices = [];
        var matchCounter = 0;

        extension.LoopbackService = function() {
            loopbackServices.push(this);
            this.playerID = "" + indexCounter;
            indexCounter++;
            this.signal = new Cocoon.Signal();
            this.on = this.signal.expose();
        }

        extension.LoopbackService.prototype =  {

            findMatch : function(request, callback)  {

                this.findMatchCallback = callback;

                //checks if the service is already added to the match list
                var exists = false;
                for (var i = 0; i< matchServices.length; ++i) {
                    if (matchServices[i] === this) {
                        exists = true; break;
                    }
                }
                if (!exists)
                    matchServices.push(this);

                //Create the match is all required players are ready
                //TODO: check more conditions (playerGroup, playerAttributes) to complete a match
                if (matchServices.length >= request.minPlayers) {
                    var playerIDs = [];
                    //create playerIDs array
                    for (var i = 0; i< matchServices.length; ++i) {
                        playerIDs.push(matchServices[i].getPlayerID());
                    }

                    //notify the found match to each manager
                    for (var i = 0; i< matchServices.length; ++i) {
                        var match = new LoopbackMatch(matchServices[i]);
                        match.playerIDs = playerIDs.slice();
                        matchServices[i].currentMatch = match;
                        matchServices[i].findMatchCallback(match, null);
                    }
                    //clear pending list
                    matchServices = [];
                }


            },
            findAutoMatch : function(matchRequest, callback) {
                this.findMatch(matchRequest,callback);
            },
            cancelAutoMatch : function() {

            },

            addPlayersToMatch : function(matchRequest, match, callback) {
                callback({message:"Not implemmented"});
            },
            getPlayerID : function() {
                return this.playerID;
            },

            getMatch : function() {
                return this.currentMatch;
            }
        }

        var LoopbackMatch = function(service) {
            matchCounter++;
            this.started = false;
            this.disconnected = false;
            this.pendingData = [];
            this.service = service;
            this.signal = new Cocoon.Signal();
            this.on = this.signal.expose();
        };

        LoopbackMatch.prototype = {

            start : function() {
                var me = this;
                setTimeout(function() {
                    me.started = true;
                    for (var i = 0; i < me.pendingData.length; ++i) {
                        me.signal.emit('match', 'dataReceived', [me, me.pendingData[i].data, me.pendingData[i].player]);
                    }
                    me.pendingData = [];

                },0);

            },
            sendDataToAllPlayers : function(data, sendMode) {
                this.sendData(data, this.playerIDs, sendMode);
            },

            sendData : function(data, playerIDs,  sendMode) {
                var me = this;
                setTimeout(function() {
                    for (var i = 0; i< loopbackServices.length; ++i) {
                        var destService = null;
                        for (var j = 0; j < playerIDs.length; ++j) {
                            if (playerIDs[j] === loopbackServices[i].getPlayerID()) {
                                destService = loopbackServices[i];
                            }
                        }
                        if (destService) {
                            destService.getMatch().notifyDataReceived(data,me.service.getPlayerID());
                        }
                    }
                },0);
            },

            disconnect : function() {
                this.disconnected = true;
                for (var i = 0; i < this.playerIDs.length; ++i) {
                    var p = this.playerIDs[i];
                    for (var j = 0; j < loopbackServices.length; ++j) {
                        if (loopbackServices[j].getPlayerID() === p) {
                            var match = loopbackServices[i].getMatch();
                            if (!match.disconnected) {
                                match.signal.emit('match', 'stateChanged', [match, this.service.getPlayerID(), Cocoon.Multiplayer.ConnectionState.DISCONNECTED]);
                            }
                        }
                    }
                }
            },

            requestPlayersInfo : function(callback) {
                var me = this;
                setTimeout(function() {
                    var playersInfo = [];
                    for (var i = 0; i < me.playerIDs.length; ++i) {
                        playersInfo[i] = {userID: me.playerIDs[i], userName: "Player" + me.playerIDs[i]};
                    }
                    callback(playersInfo);
                },1);
            },

            getExpectedPlayerCount : function() {
                return 0;
            },
            getPlayerIDs : function() {
                return this.playerIDs;
            },
            getLocalPlayerID: function() {
                return this.service.playerID;
            },
            notifyDataReceived: function(data, fromPlayer) {
                if (this.disconnected) {
                    return;
                }
                if (!this.started) {
                    this.pendingData.push({data:data, player:fromPlayer});
                }
                else {
                    this.signal.emit('match', 'dataReceived', [this, data,fromPlayer]);
                }
            }

        };

        return extension;
    });

})();

