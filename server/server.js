//Inspired by mqtt-panel - https://github.com/fabaff/mqtt-panel

console.log('ZoneCON Socket.IO Reverse Proxy using Node.js & Socket.IO.');

//initialise requirements
var mqtt = require('mqtt');
var socket = require('socket.io');
var dateFormat = require('dateformat');

dateFormat.masks.timestampFormat = 'hh:MM:sstt dd/mm/yyyy';

var socketPort = 8083;

console.log('Attempting to listen to port '+socketPort+'...');
var io = socket.listen(socketPort,	{
	path:'/js/lib/socket.io'
});
console.log('Port listened.');

io.sockets.on('connection', function (socket) {
	console.log('Socket connection established.');
	
	//MQTT connection variables
	var mqttBroker = 'mqtt://192.168.1.30';
	var randomId = Math.floor((Math.random()*1000)+1);
	var options = 	{
		clientId: 'zonecon_web_client_'+randomId.toString(),
		port: 1883
		};
	
	//Open connection to MQTT Broker
	console.log('Attempting to connect to MQTT broker at '+mqttBroker+'...');
	var client = mqtt.connect(mqttBroker, options);
	socket.on('connect', function() {
		console.log('Client opened connection to MQTT broker.');
	});
	
	//Close connection to MQTT Broker
	socket.on('close', function() {
		console.log('Client closed connection to MQTT broker.');
	});
	
	//Subscribe
	socket.on('subscribe', function(data) {
		console.log('Subscribing to '+data.topic+'.');
		//socket.join(data.topic);
		client.subscribe(data.topic);
	});
	
	//Disconnect
	socket.on('disconnect', function(data) {
		console.log('Disconnecting from MQTT broker');
		client.end();
	});
	
	//Message Received
	client.on('message', function(topic, message) {
		console.log('MQTT Message received.');
		console.log('Topic:'+topic);
		console.log('Message:'+message);
		
		var timestamp = dateFormat("timestampFormat");
		
		console.log('Time:'+timestamp);
		console.log('Transmitting to Socket...');
		//io.sockets.in(topic).emit('mqtt',
		io.sockets.emit('mqtt',
		{
			'topic'		: topic,
			'message'	: message,
			'timestamp'	: timestamp
		});
	});
	
	
});
