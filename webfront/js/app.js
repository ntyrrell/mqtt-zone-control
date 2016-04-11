(function() {
	var app = angular.module('floorplan',[]);

	app.controller("FloorplanController",['$scope','socket','xmlJson', function($scope, socket, xmlJson) {

        //Controller Logic
        $scope.floors = {};
		$scope.group = 'All';
		$scope.display = 'Both';
		$scope.connectionState = 'Offline';

		loadData('ground');
		loadData('underground');

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

		$scope.isConnected = function() {
			return $scope.connectionState === 'Online';
		};

		$scope.isDisconnected = function() {
			return $scope.connectionState === 'Offline';
		};

        //Socket listeners
        socket.on('connect', function () {
            console.log('connected to MQTT broker');
			$scope.connectionState = 'Online';
			socket.on('mqtt', function (msg) {
				console.log('message received from MQTT broker');
				var messageTopic = msg.topic.split('/');
				var floorName = messageTopic[1];
				var room = messageTopic[2];
				var component = messageTopic[3];
                var payload = socket.arrayBufferToString(msg.message);
                var timestamp = msg.timestamp;
				console.log("Floor: "+floorName+"\nRoom: "+room+"\n"+component+": "+payload+"\nTime: "+timestamp);

				$scope.floors[floorName][room].setState(payload);
				$scope.floors[floorName][room].setLastUpdated(timestamp);
			});
			socket.on('disconnect', function (msg) {
				console.log('Disconnected from MQTT broker');
				$scope.connectionState = 'Offline';
			});
            socket.emit('subscribe',{topic:'londonbridge/#'});
        });

		function loadData(floorname) {
			xmlJson.getData(floorname).success(function(data){
				//Add a new floor key
				var floor = data.svg._id;
				var xml = data.svg.g;
				$scope.floors[floor] = {};
				for (var i = 0; i<xml.g.length; i++) {
					if (xml.g[i]._class === "room") {
						//Add a new room with a key value equal to the id
						$scope.floors[floor][xml.g[i]._id] = new Room();
					}
				}
			});
		};
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
                return string.replace(/\W/g, ''); //removes hidden non-alphanumeric characters
            }
        }
    }]);

	app.factory('xmlJson', ['$http', function($http) {
		var factory = [];
		factory.getData = function(floorname) {
			return $http({
				method: 'GET',
				url: '/img/'+floorname+'.svg',
				transformResponse: function(data) {
					var x2js = new X2JS();
					return x2js.xml_str2json(data);
				}
			});
		};

		return factory;
	}]);

	app.directive('groundFloor', function() {
		return {
			restrict: 'E',
			templateUrl: 'view/ground.html'
		};
	});

	app.directive('underground', function() {
		return {
			restrict: 'E',
			templateUrl: 'view/underground.html'
		};
	});


	app.directive('svgGroundFloor', ['$compile', function ($compile) {
		return {
			restrict: 'E',
			templateUrl: 'img/ground.svg',
			link: function (scope, element) {
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

	app.directive('svgUnderground', ['$compile', function ($compile) {
		return {
			restrict: 'E',
			templateUrl: 'img/underground.svg',
			link: function (scope, element) {
				var regions = element[0].querySelectorAll('.room');
				angular.forEach(regions, function (path, key) {
					var roomElement = angular.element(path);
					roomElement.attr("room", "");
					roomElement.attr("floor", "underground");
					roomElement.attr("floors", "floors");
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
			link: function (scope, element) {
				scope.elementId = element.attr("id");
				scope.floor = element.attr("floor");
/*				scope.roomClick = function () {
					alert(scope.floors[scope.floor][scope.elementId].getState());
				};
				element.attr("ng-click", "roomClick()");*/
				element.attr("ng-attr-fill", "{{floors[floor][elementId].getState()|roomColour}}");
				element.removeAttr("floor");
				element.removeAttr("room");
				$compile(element)(scope);
			}
		}
	}]);

	function Room() {
		var state = "offline";
		var lastUpdated = "N/A";

		this.getState = function() {
			return state;
		};

		this.isState = function(newState){
			return state === newState;
		};

		this.setState = function(newState) {
			state = newState;
		};

		this.getLastUpdated = function() {
			return lastUpdated;
		};

		this.setLastUpdated = function(newUpdated) {
			lastUpdated = newUpdated;
		};
	}

})();
