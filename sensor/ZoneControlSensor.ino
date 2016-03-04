/**
Zone Control Sensor
Copyright (c) Nicholas Tyrrell, Bournemouth University
Code inspired by http://www.eclipse.org/paho/clients/c/embedded/
*/

#include <SPI.h>
#include <Ethernet2.h>
#include <IPStack.h>
#include <Countdown.h>
#include <MQTTClient.h>

//IP variables
EthernetClient ethClient;
IPStack ipstack(ethClient);

//IP constants
byte mac[] = { 0x90, 0xA2, 0xDA, 0x10, 0x39, 0x37 }; //MAC address for sensor device

//MQTT variables
MQTT::Client<IPStack, Countdown, 50, 1> mqttClient = MQTT::Client<IPStack, Countdown, 50, 1>(ipstack);
char room[21] = "roman"; //name of room within building

//MQTT constants
#define MQTTCLIENT_QOS2 1
const char* mainTopic = "londonbridge";
MQTT::QoS qos = MQTT::QOS1;
bool retained = true;

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
	char host[] = "iot.eclipse.org";
	int port = 1883;
	int returnCode;

	//connect to MQTT broker device using IP and port
	returnCode = ipstack.connect(host, port);
	//if IP connection successful
	if (returnCode == 1) {
		//initialise MQTT connection data
		MQTTPacket_connectData data = MQTTPacket_connectData_initializer;
		data.MQTTVersion = 3;
		data.clientID.cstring = (char*)"sensor-1";

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
int publishToBroker(char topic[11], char message[11]) {
	//initialise variables
	char topicBuffer[100];
	char messageBuffer[100];
	void* payload;
	size_t payloadlen;

	//store copy of input arrays to buffers
	strcpy(topicBuffer, mainTopic);
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
	return returnCode;
}

/**
Sets the current state of the room
*/
void setRoomState() {
	//initialise variable
	int returnCode = -1;

	//turn on send LED
	digitalWrite(leds[3], HIGH);
	//if new state is equal to current state
	if (newRoomState == currentRoomState) {
		//turn off state LEDs
		for (int i = 0; i < numLeds - 1; i++) {
			digitalWrite(leds[i], LOW);
		}
		//set current state to inactive
		currentRoomState = INACTIVE;
		returnCode = publishToBroker("state", "inactive");
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
		returnCode = publishToBroker("state", "emergency");
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
		returnCode = publishToBroker("state", "caution");
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
		returnCode = publishToBroker("state", "active");
	}
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
	if (!mqttClient.isConnected()) {
		connect();
	} else {
		checkSwitches();
	}
}