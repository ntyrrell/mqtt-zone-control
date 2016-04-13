/**
Zone Control Sensor
Copyright (c) Nicholas Tyrrell, Bournemouth University
Code inspired by http://www.eclipse.org/paho/clients/c/embedded/
*/

#define MQTTCLIENT_QOS2 1

#include <SPI.h>
#include <Ethernet2.h>
#include <IPStack.h>
#include <Countdown.h>
#include <MQTTClient.h>

//IP variables
EthernetClient ethClient;
IPStack ipstack(ethClient);

//IP constants
byte mac[] = { 0x90, 0xA2, 0xDA, 0x10, 0x39, 0x2A }; //MAC address for sensor device

//MQTT constants
const char* mainTopic = "londonbridge";
MQTT::QoS qos = MQTT::QOS2;
bool retained = true;
int timeout = 5000; //5 seconds for client to publish before timing out

//MQTT variables
MQTT::Client<IPStack, Countdown> mqttClient = MQTT::Client<IPStack, Countdown>(ipstack, timeout);
char floorName[21] = "ground"; //floor of room within building
char room[21] = "william_wallace"; //name of room within building
char* clientId = "sensor-2"; //sensor id

//Room State
enum RoomState
{
	ACTIVE, CAUTION, EMERGENCY, INACTIVE
};

RoomState newRoomState;
RoomState currentRoomState;
bool roomStateChanged = false;

//Switches
const byte switches[] = { 7,8,9 }; // active, caution and emergency
const int numSwitches = sizeof(switches);

//Switch States
byte pastSwitchStates[numSwitches];
byte currentSwitchStates[numSwitches];

//LEDs
const byte leds[] = { 2,3,4,5 }; //active, caution, emergency, send
const int numLeds = sizeof(leds);

//Debounce
const int debounce = 20; //number of milliseconds to delay the code to prevent rapid fluctuation in reading

/**
connects the sensor to the MQTT broker over TCP/IP
*/
void connect() {
	//initialise variables
	//char host[] = "iot.eclipse.org";
	IPAddress host(192, 168, 1, 30); //eMQTT broker local IP address
	int port = 1883;
	int returnCode;

	//connect to MQTT broker device using IP and port
	returnCode = ipstack.connect(host, port);
	//if IP connection successful
	if (returnCode == 1) {
		//dynamically set the room's state for will message topic
		char willTopicBuffer[100];
		strcpy(willTopicBuffer, mainTopic);
		strcat(willTopicBuffer, "/");
		strcat(willTopicBuffer, floorName);
		strcat(willTopicBuffer, "/");
		strcat(willTopicBuffer, room);
		strcat(willTopicBuffer, "/state");

		//initialise MQTT connection data
		MQTTPacket_connectData data = MQTTPacket_connectData_initializer;
		data.willFlag = 1;
		data.MQTTVersion = 4;
		data.cleansession = 1;
		data.keepAliveInterval = 10;
		data.clientID.cstring = clientId;
		data.will.topicName.cstring = (char*)willTopicBuffer;
		data.will.qos = 2;
		data.will.retained = 1;
		data.will.message.cstring = (char*)"error";
		//connect to MQTT broker
		returnCode = mqttClient.connect(data);
		//if MQTT connection successful
		if (returnCode == 0) {
			//output success message
			Serial.print("Successfully connected to MQTT broker ");
			Serial.print(host);
			Serial.print(" at port ");
			Serial.println(port);
		}
		else {
			//MQTT Connection error
			Serial.print("Error: Could not connect to MQTT Broker. Return code = ");
			Serial.println(returnCode);
		}
	}
	else {
		//TCP Connection error
		Serial.print("Error: Could not connect to IP address via TCP. Return code = ");
		Serial.println(returnCode);
	}
}

/**
Publishes a message to the MQTT Broker
*/
void publishToBroker(char topic[11], char message[11]) {
	//turn on send LED
	digitalWrite(leds[3], HIGH);

	//initialise variables
	char topicBuffer[100];
	char messageBuffer[100];
	void* payload;
	size_t payloadlen;

	//store copy of input arrays to buffers
	strcpy(topicBuffer, mainTopic);
	strcat(topicBuffer, "/");
	strcat(topicBuffer, floorName);
	strcat(topicBuffer, "/");
	strcat(topicBuffer, room);
	strcat(topicBuffer, "/");
	strcat(topicBuffer, topic);
	strcpy(messageBuffer, message);

	//set message parameters
	payload = (void*)messageBuffer;
	payloadlen = strlen(messageBuffer) + 1;

	//publish message
	Serial.print("Topic: ");
	Serial.println(topicBuffer);
	Serial.print("Message: ");
	Serial.println((char*)payload);
	int returnCode = mqttClient.publish(topicBuffer, payload, payloadlen, qos, retained);
	//if message publish not successful, error has occured
	//report an error until board restarted and problem fixed
	while (returnCode != 0) {
		//turn off state LEDs
		for (int i = 0; i < numLeds - 1; i++) {
			digitalWrite(leds[i], LOW);
		}
		//flash send LED twice a second
		digitalWrite(leds[3], HIGH);
		delay(250);
		digitalWrite(leds[3], LOW);
		delay(250);
	}
	//turn off send LED
	digitalWrite(leds[3], LOW);
}

/**
Sets the current state of the room
*/
void setRoomState() {
	//if new state is equal to current state
	if (newRoomState == currentRoomState) {
		//turn off state LEDs
		for (int i = 0; i < numLeds - 1; i++) {
			digitalWrite(leds[i], LOW);
		}
		//set current state to inactive
		currentRoomState = INACTIVE;
		publishToBroker("state", "inactive");
	}
	//else if emergency button pressed
	else if (newRoomState == EMERGENCY) {
		//turn off active and caution LEDs
		digitalWrite(leds[0], LOW);
		digitalWrite(leds[1], LOW);
		//turn on emergency LED
		digitalWrite(leds[2], HIGH);
		//set current state to emergency
		currentRoomState = EMERGENCY;
		publishToBroker("state", "emergency");
	}
	//else if caution button pressed
	else if (newRoomState == CAUTION) {
		//turn off active and emergency LEDs
		digitalWrite(leds[0], LOW);
		digitalWrite(leds[2], LOW);
		//turn on caution LED
		digitalWrite(leds[1], HIGH);
		//set current state to caution
		currentRoomState = CAUTION;
		publishToBroker("state", "caution");
	}
	//else if active button pressed
	else if (newRoomState == ACTIVE) {
		//turn off emergency and caution LEDs
		digitalWrite(leds[1], LOW);
		digitalWrite(leds[2], LOW);
		//turn on active LED
		digitalWrite(leds[0], HIGH);
		//set current state to active
		currentRoomState = ACTIVE;
		publishToBroker("state", "active");
	}
}

/**
Checks the current state of switches to see if they've changed
*/
void checkSwitches() {
	//for each button
	for (int i = 0; i < numSwitches; i++) {
		//set current state of switch to read in of switch pin
		currentSwitchStates[i] = digitalRead(switches[i]);

		//if button has been pressed
		if (currentSwitchStates[i] == LOW && pastSwitchStates[i] == HIGH) {
			//change new room state according to button pressed
			switch (i)
			{
			case 0:
				newRoomState = ACTIVE;
				break;
			case 1:
				newRoomState = CAUTION;
				break;
			case 2:
				newRoomState = EMERGENCY;
			default:
				break;
			}
			
			//set room state changed to true
			roomStateChanged = true;
			//pause code to prevent debouncing
			delay(debounce);
		}
		
		//if button has been released
		if (currentSwitchStates[i] == HIGH && pastSwitchStates[i] == LOW) {
			//pause code to prevent debouncing
			delay(debounce);
		}

		//set past state of switch to current state of switch - value is now old
		pastSwitchStates[i] = currentSwitchStates[i];

		//if room state changed, set the new room state
		if (roomStateChanged) {
			setRoomState();
		}
		roomStateChanged = false;
	}
}

void setup() {
	Serial.begin(9600);
	//initialise switch pins
	for (int i = 0; i < numSwitches; i++) {
		pinMode(switches[i], INPUT_PULLUP);
	}
	//initialise LED pins
	for (int i = 0; i < numLeds; i++) {
		pinMode(leds[i], OUTPUT);
	}
	//establish Ethernet connection
	Ethernet.begin(mac);
	//connect to MQTT broker
	while (!mqttClient.isConnected()){
		connect();
	}
	//set current room state to inactive
	currentRoomState = INACTIVE;
	publishToBroker("state", "inactive");
}

void loop() {
	while (!mqttClient.isConnected()) {
		connect();
	}
	checkSwitches();
	mqttClient.yield(10);
}