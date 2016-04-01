(function() {
	var app = angular.module('floorplan',[]);

	app.controller("FloorplanController", function(socket) {
        //Controller Logic
        this.floors = floors;
        this.group = 'All';
        this.display = 'Both';

        this.setGroup = function(group) {
            this.group = group;
		};

        this.isGroup = function(group) {
			return this.group === group;
		};

        this.setDisplay = function(display) {
            this.display = display;
		};

        this.isDisplay = function(display) {
			return this.display === display;
		};

        //Socket listeners
        socket.on('connect', function () {
            console.log('connected to MQTT broker');
			socket.on('mqtt', function (msg) {
				console.log('message received from MQTT broker');
				var messageTopic = msg.topic.split('/');
				var floorName = messageTopic[1];
				var room = messageTopic[2];
				var component = messageTopic[3];
                var payload = socket.arrayBufferToString(msg.message);
                var timestamp = msg.timestamp;
				console.log("Floor: "+floorName+"\nRoom: "+room+"\n"+component+": "+payload.toString()+"\nTime: "+timestamp);
			});
            socket.emit('subscribe',{topic:'londonbridge/#'});
        });
	});

	app.filter('replaceUnderscores', function() {
		return function(input, replacement) {
			if(typeof input == "string") {
				if (replacement === null) {
					return input.replace(/_/g, '');
				} else {
					return input.replace(/_/g, replacement);
				}
			} else {
				return null;
			}
		};
	});

    //inspired by HTML5Rocks.com - http://www.html5rocks.com/en/tutorials/frameworks/angular-websockets/
    app.factory('socket', function($rootScope) {
        var socket = io.connect('192.168.1.20:8083', {
            path:'/js/lib/socket.io'
        });
        return {
            on: function (eventName, callback) {
                socket.on(eventName, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        callback.apply(socket, args);
                    });
                });
            },
            emit: function (eventName, data, callback) {
                socket.emit(eventName, data, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    })
                })
            },
            arrayBufferToString: function(data) {
                return String.fromCharCode.apply(null, new Uint8Array(data));
            }
        }
    });

	var floors = [
		{
		name: "Ground",
		img: "img/ground.svg",
		rooms : [
			{
				id: "room_1",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_2",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_3",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "1830_bridge",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "burning_bridge",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_4",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "william_wallace",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_5",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "compressor",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "viking_room_3",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "viking_room_2",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "crown_room",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "roman_walkthrough",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "viking_room_1",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_6",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "bathroom",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "museum",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "roman_room",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "cafe",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_7",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "retail",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "photo",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_8",
				state: "Offline",
				lastUpdated: "N/A"
			}
		]},
		{
		name: "Basement",
		img: "img/basement.svg",
		rooms : [
			{
				id: "staff_bathroom",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_1",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "staff_corridor",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_2",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "staff_room",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "construction_site",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_3",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "root_maze",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "bone_yard",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_4",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "boiler_room",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "big_squeeze",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "spider_room",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "tombs",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "sewers",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_5",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_6",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_7",
				state: "Offline",
				lastUpdated: "N/A"
			},
			{
				id: "room_8",
				state: "Offline",
				lastUpdated: "N/A"
			}
		]}
	];
})();
