(function() {
	var app = angular.module('floorplan',[]);

	app.controller("FloorplanController",['$scope','socket', function($scope, socket) {

        //Controller Logic
        $scope.floors = floors;
		$scope.group = 'All';
		$scope.display = 'Both';

		$scope.setGroup = function(group) {
			$scope.group = group;
		};

		$scope.isGroup = function(group) {
			return $scope.group === group;
		};

		$scope.setDisplay = function(display) {
			$scope.display = display;
		};

		$scope.isDisplay = function(display) {
			return $scope.display === display;
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
				console.log("Floor: "+floorName+"\nRoom: "+room+"\n"+component+": "+payload+"\nTime: "+timestamp);

				console.log(payload.length);
				$scope.floors[floorName][room].setState(payload);
				$scope.floors[floorName][room].setLastUpdated(timestamp);
			});
            socket.emit('subscribe',{topic:'londonbridge/#'});
        });
	}]);

	app.filter('replaceUnderscores', [ function() {
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
	}]);

    app.filter('roomColour', [ function() {
        return function (input) {
            if (input == "active") {
                return "rgb(0,255,0)";
            } else if (input == "caution") {
                return "rgb(0,0,255)";
            } else if (input == "emergency") {
                return "rgb(255,0,0)";
            } else if (input == "inactive"){
                return "rgb(255,0,255)";
            } else if (input == "error") {
                return "rgb(255,255,0)";
			}else { //not a recognised state, set to "offline" default
                return "rgb(0,0,0)";
            }
        }
    }]);

    //inspired by HTML5Rocks.com - http://www.html5rocks.com/en/tutorials/frameworks/angular-websockets/
    app.factory('socket', ['$rootScope', function($rootScope) {
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
				var string = String.fromCharCode.apply(null, new Uint8Array(data));
                return string.slice(0,-1); //removes hidden character at end
            }
        }
    }]);

	app.directive('groundFloor', function() {
		return {
			restrict: 'E',
			templateUrl: 'view/ground.html'
		};
	});

	app.directive('basement', function() {
		return {
			restrict: 'E',
			templateUrl: 'view/basement.html'
		};
	});


	app.directive('svgGroundFloor', ['$compile', function ($compile) {
		return {
			restrict: 'E',
			templateUrl: 'img/ground.svg',
			link: function (scope, element, attrs) {
				var regions = element[0].querySelectorAll('.room');
				angular.forEach(regions, function (path, key) {
					var roomElement = angular.element(path);
					roomElement.attr("room", "");
					roomElement.attr("floor", "ground");
					roomElement.attr("floors", 'floors');
					$compile(roomElement)(scope);
				})
			}
		}
	}]);

	app.directive('svgBasement', ['$compile', function ($compile) {
		return {
			restrict: 'E',
			templateUrl: 'img/basement.svg',
			link: function (scope, element, attrs) {
				var regions = element[0].querySelectorAll('.room');
				angular.forEach(regions, function (path, key) {
					var roomElement = angular.element(path);
					roomElement.attr("room", "");
					roomElement.attr("floor", "basement");
					roomElement.attr("floor", "floors");
					$compile(roomElement)(scope);
				})
			}
		}
	}]);

	app.directive('room', ['$compile', function ($compile) {
		return {
			restrict: 'A',
			scope : {
				floors: "="
			},
			link: function (scope, element, attrs) {
				scope.elementId = element.attr("id");
				scope.floor = element.attr("floor");
				element.attr("ng-attr-fill", "{{floors[floor][elementId].getState()|roomColour}}");
				element.removeAttr("room");
				$compile(element)(scope);
			}
		}
	}]);

/*	app.directive('basementRoom', ['$compile', function ($compile) {
		return {
			restrict: 'A',
			scope : {
				floor: "="
			},
			link: function (scope, element, attrs) {
				scope.elementId = element.attr("id");
				console.log(scope.elementId);
				console.log(scope.floor);
				scope.roomClick = function () {
					alert(scope.floor[scope.elementId].state);
				};
				element.attr("ng-click", "roomClick()");
				element.removeAttr("basement-room");
				$compile(element)(scope);
			}
		}
	}]);*/

	function Room() {
		var state = "offline";
		var lastUpdated = "N/A";

		this.getState = function() {
			return state;
		};

		this.isState = function(newState){
			return state === newState;
		}

		this.setState = function(newState) {
			state = newState;
		};

		this.getLastUpdated = function() {
			return lastUpdated;
		};

		this.setLastUpdated = function(newUpdated) {
			lastUpdated = newUpdated;
		}
	}

	var floors = {
		"ground": {
			"room_1" : new Room(),
			"room_2": new Room(),
			"room_3": new Room(),
			"1830_bridge": new Room(),
			"burning_bridge":new Room(),
			"room_4": new Room(),
			"william_wallace":new Room(),
			"room_5": new Room(),
			"compressor": new Room(),
			"viking_room_3": new Room(),
			"viking_room_2": new Room(),
			"crown_room": new Room(),
			"roman_walkthrough": new Room(),
			"viking_room_1": new Room(),
			"room_6": new Room(),
			"bathroom": new Room(),
			"museum": new Room(),
			"roman_room":new Room(),
			"cafe": new Room(),
			"room_7": new Room(),
			"retail": new Room(),
			"photo": new Room(),
			"room_8": new Room()
		},
		"basement": {
			"staff_bathroom": new Room(),
			"room_1": new Room(),
			"staff_corridor": new Room(),
			"room_2": new Room(),
			"staff_room": new Room(),
			"construction_site": new Room(),
			"room_3": new Room(),
			"root_maze": new Room(),
			"bone_yard": new Room(),
			"room_4": new Room(),
			"boiler_room": new Room(),
			"big_squeeze": new Room(),
			"spider_room": new Room(),
			"tombs": new Room(),
			"sewers": new Room(),
			"room_5": new Room(),
			"room_6": new Room(),
			"room_7": new Room(),
			"room_8": new Room()
		}
	};

})();
