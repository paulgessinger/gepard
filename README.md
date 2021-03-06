# gepard
General purpose communication and synchronization layer for distributed applications / Microservices / events, semaphores, locks and messages for JavaScript, Java and Python

<!-- MarkdownTOC -->

- [Overview](#overview)
- [What is new](#what-is-new)
	- [Release 1-8-1 Maintenance and Bugfix](#release-1-8-1-maintenance-and-bugfix)
	- [Release 1-8-0 Java Connect Retry on First Connect](#release-1-8-0-java-connect-retry-on-first-connect)
	- [Release 1-7-9 WebClient New Reconnect Mechanism](#release-1-7-9-webclient-new-reconnect-mechanism)
	- [Release 1-7-8 WebClient Enhancement / Bugfix](#release-1-7-8-webclient-enhancement--bugfix)
	- [Release 1-7-6 WebClient Enhancement](#release-1-7-6-webclient-enhancement)
	- [Release 1-7-5 JavaScript Enhancements](#release-1-7-5-javascript-enhancements)
	- [Release 1-7-0 mDNS Zeroconf for Python](#release-1-7-0-mdns-zeroconf-for-python)
	- [Release 1-6-0 mDNS Zeroconf](#release-1-6-0-mdns-zeroconf)
	- [Release 1-5-0 Channels](#release-1-5-0-channels)
	- [Release 1-4-5 Registered Event-names may contain Wildcards \(RegExp\)](#release-1-4-5-registered-event-names-may-contain-wildcards-regexp)
	- [Release 1-4-5 Simplified Handling of JSON Trees](#release-1-4-5-simplified-handling-of-json-trees)
	- [Release 1-4-3 Logging](#release-1-4-3-logging)
	- [Release 1-4-0 New Heartbeat Protocol to ensure the Availability of Connections](#release-1-4-0-new-heartbeat-protocol-to-ensure-the-availability-of-connections)
	- [Release 1-3-3 New FileContainer class for Python, JavaScript and Java to simplify file-transfer.](#release-1-3-3-new-filecontainer-class-for-python-javascript-and-java-to-simplify-file-transfer)
	- [Release 1-3-0 Let's talk about Python](#release-1-3-0-lets-talk-about-python)
	- [Controlling Connections and Actions with a Hook](#controlling-connections-and-actions-with-a-hook)
	- [Perfect load balanced message handling.](#perfect-load-balanced-message-handling)
	- [Java bindings for all features:](#java-bindings-for-all-features)
- [Install](#install)
- [Getting Started](#getting-started)
	- [Base](#base)
	- [JavaScript](#javascript)
	- [Java](#java)
	- [Python](#python)
- [Configuration](#configuration)
- [Use Cases](#use-cases)
	- [Configuration Changes \(Events\)](#configuration-changes-events)
	- [Concurrent editing of a Dataset \(Semaphores\)](#concurrent-editing-of-a-dataset-semaphores)
	- [Synchronization of file processing \(Locks\)](#synchronization-of-file-processing-locks)
	- [A Nice Exotic Mixture of Programming Languages](#a-nice-exotic-mixture-of-programming-languages)
- [The Event Body](#the-event-body)
- [Examples](#examples)
	- [Examples Short](#examples-short)
	- [Examples Long](#examples-long)
- [File Transfer with the FileContainer Class](#file-transfer-with-the-filecontainer-class)
	- [FileSender](#filesender)
	- [FileReceiver](#filereceiver)
- [Heartbeat and Reconnection Capability Parameterization](#heartbeat-and-reconnection-capability-parameterization)
	- [Broker Side](#broker-side)
	- [Client Side](#client-side)
- [The TracePoint Concept](#the-tracepoint-concept)
	- [TracePoints in the Broker](#tracepoints-in-the-broker)
	- [TracePoints in the Client](#tracepoints-in-the-client)
- [Zeroconf Usage in Detail](#zeroconf-usage-in-detail)
	- [Zeronconf on the Broker's Side](#zeronconf-on-the-brokers-side)
	- [Zeroconf on the Client's Side](#zeroconf-on-the-clients-side)
- [Technical Aspects of the Client](#technical-aspects-of-the-client)
- [Found a bug? Help us fix it...](#found-a-bug-help-us-fix-it)
- [https://github.com/gessinger-hj/gepard/blob/master/CHANGELOG.md](#httpsgithubcomgessinger-hjgepardblobmasterchangelogmd)
- [Contributors](#contributors)
- [Features](#features)
- [Changelog](#changelog)

<!-- /MarkdownTOC -->

<a name="overview"></a>
# Overview
Gepard is a system consisting of a broker and connected clients.
The communication is done via sockets or web-sockets.
The sockets are always open so that any partner of a connection may be informed if this connection ended.
This is very useful in the area of semaphores and locks.
<br/>
A client uses only one socket for all interactions with the broker. Thus a program needs only 1 client for all features.
In order to use only 1 Client instance it is suggested to use the static method

* JavaScript:

```js
gepard = require  ( "gepard" )  :
var client = gepard.getClient ( [ port [, host ] ] ) ;
```

* Java:

```java
import org.gessinger.gepard.Client ;
Client client = Client.getInstance ( [ port [, host ] ] ) ;

```

* Python:

```py
import gepard
client = gepard.Client.getInstance ( [ port [, host ] ] ) ;

```

Up to now a client is a standalone JavaScript program, a JavaScript app inside a browser, a Java program or a Python program.
In the next step clients for other languages like Php, Perl etc are planned.

The broker can be instantiated from a JavaScript program but the most common and simplest way to use it is to start it detached as a daemon.

The appropriate command is:

```bash
node_modules/.bin/gp.broker
```
This starts the Broker and the corresponding web-socket-proxy
<br/>
If you want to start the broker alone:

```bash
node_modules/.bin/gp.broker.no.web
```

There is a separate program for administration purposes:
```bash
node_modules/.bin/gp.info
```
or

```bash
node_modules/.bin/gp.admin [ --help ]
```
There is a special command for service-lookup:
```bash
node_modules/.bin/gp.lookup --gepard.zeronconf.type=<type-name>
e.g.:
node_modules/.bin/gp.lookup --gepard.zeronconf.type=test-gepard
```
This command lists all service-instances with the service-type __test-gepard__ in the local subnet.

<a name="what-is-new"></a>
# What is new

<a name="release-1-8-1-maintenance-and-bugfix"></a>
## Release 1-8-1 Maintenance and Bugfix
Maintenance release. [Details](https://github.com/gessinger-hj/gepard/blob/master/CHANGELOG.md)

<a name="release-1-8-0-java-connect-retry-on-first-connect"></a>
## Release 1-8-0 Java Connect Retry on First Connect
If re-connect is requested and there is no reachable Broker then the Java client tries to
connect every 5 seconds to establish a valid connection.
This is the same behaviour as the JavaScript client and the WebClient used in a browser.

<a name="release-1-7-9-webclient-new-reconnect-mechanism"></a>
## Release 1-7-9 WebClient New Reconnect Mechanism

If re-connect is requested with

client.setReconnect ( true )

the client acts as follows:

1.	If a running WebSocketEventProxy accepts a connection: connect.
1.	If ther is no running WebSocketEventProxy try to connect every 5 seconds forever.

If a re-connect is set but the client should exit if there is no running WebSocketEventProxy then
an error listener can be registered. In this listener-function the re-connect setting can be
reset.

Example:

```js
		c.on('error', function(e)
		{
			c.setReconnect ( false ) ;
		});
```
In addition if a WebSocket-connection dies a re-connect is tried every 5 seconds.
In this case all event-listener are registered again.

<a name="release-1-7-8-webclient-enhancement--bugfix"></a>
## Release 1-7-8 WebClient Enhancement / Bugfix
- GPWebClient: protected event-names for method on ( name, callback):
  "open", "close", "error", "shutdown", "end"
- WebSocket: use protocol wss only for https:
- GPWebClient: new method: close().
	Can be used with the browser's event __onbeforeunload__ to close a connection.

<a name="release-1-7-6-webclient-enhancement"></a>
## Release 1-7-6 WebClient Enhancement

Enable GPWebClient to optional use another target domain (host).
Mainly the method gepard.getWebClient ( port ) now accepts an optional doman (host) as second parameter like:
gepard.getWebClient ( 12345, "my.domain.com" ) ;

<a name="release-1-7-5-javascript-enhancements"></a>
## Release 1-7-5 JavaScript Enhancements

If re-connect is requested with

1.	Environment: export GEPARD_RECONNECT=true
1.	Option as argument: --gepard.reconnect=true
1.	client.setReconnect ( true )

the client acts as follows:

1.	If a running Broker accepts a connection: connect.
1.	If ther is no running Broker try to connect every 5 seconds forever.

If a re-connect is set but the client should exit if there is no running Broker then
an error listener can be registered. In this listener-function the re-connect setting can be
reset.
Example:

```js
		c.on('error', function(e)
		{
			c.setReconnect ( false ) ;
		});
```

<a name="release-1-7-0-mdns-zeroconf-for-python"></a>
## Release 1-7-0 mDNS Zeroconf for Python

This release introduces the __zeroconf__ mechanism for __Python__.
The mechanism is set up as close as possible to the JavaScript version.
Before you can use this mechanism the __python-module zeroconf must be installed__.
This is done with the command: __pip install zeroconf__. On OSX and Linux/Unix this is a trivial task.
On Windows it is more complicated so you have to read the installation documentation for this module carefully.

Zero-configuration networking (zeroconf) is a set of technologies that automatically creates a usable computer network based on the Internet Protocol Suite (TCP/IP) when computers or network peripherals are interconnected. It does not require manual operator intervention or special configuration servers.
Zeroconf mDNS plus DNS-SD: that is, multicast DNS plus DNS service discovery.
This technology is perfect to enhance the gepard based app communications.
With Gepard it is such easy:

1.	__gp.broker --gepard.zeroconf=test-gepard,0__
<br/>type: __test-gepard__
<br/>socket: __0__ (zero) means: any free port of the host

1.	__python Listener.py --gepard.zeroconf.type=test-gepard --gepard.reconnect=true__
<br/>Finds any Broker in the subnet which advertizes the service-type __test-gepard__
<br/>If currently no service is available waits for service coming up.
<br/>If service goes down a new lookup is done and all listeners are re-registered to the new found Broker.

See details in the chapter [Zeroconf Usage in Detail](#zeroconf-usage-in-detail)


<a name="release-1-6-0-mdns-zeroconf"></a>
## Release 1-6-0 mDNS Zeroconf

Zero-configuration networking (zeroconf) is a set of technologies that automatically creates a usable computer network based on the Internet Protocol Suite (TCP/IP) when computers or network peripherals are interconnected. It does not require manual operator intervention or special configuration servers.
Zeroconf mDNS plus DNS-SD: that is, multicast DNS plus DNS service discovery.
This technology is perfect to enhance the gepard based app communications.
With Gepard it is such easy:

1.	__gp.broker --gepard.zeroconf=test-gepard,__
<br/>type: __test-gepard__
<br/>socket: __0__ (zero) means: any free port of the host

1.	__node xmp/Listener.js --gepard.zeroconf.type=test-gepard --gepard.reconnect=true__
<br/>Finds any Broker in the subnet which advertizes the service-type __test-gepard__
<br/>If currently no service is available waits for service coming up.
<br/>If service goes down a new lookup is done and all listeners are re-registered to the new found Broker.

See details in the chapter [Zeroconf Usage in Detail](#zeroconf-usage-in-detail)

<a name="release-1-5-0-channels"></a>
## Release 1-5-0 Channels

This release introduces __Channels__ as a meta-layer to organize different realms in a very simple and effective manner.
<br/>
Each listener-client can subscribe for event-names in one or more channel(s).
<br/>
An emitter- / requester-client can emit events containing a channel identifier.
The Broker filters the listening-clients with this channel and sends the event only to clients on this channel.


### Using Channels

#### Event-listener

There are 3 different possibilities to subscribe to one or more channels:

1.	The method __client.setChannel ( <channel-name> )__
	<br/>The &lt;channel-name> is of the form: id{,id-2, ... id-n}
	<br/>
	Example: client.setChannel ( "A,B,C" )
	<br/>
	All events which are not emitted with one of these channel-ids are filtered-out by the broker.
	<br/>
	If a client subscribes for any event-name all name-matching and channel-matching events are propagated to the
	registered listening-function.

2.	Regardless of the client's channel-membership a shortcut for registering a listener for a specific channel is:
	<br/>
	client.on ( &lt;channel-name&gt;**::**&lt;event-name&gt;, &lt;callback> )
	<br/>
	As seen the channel-name and the event-name are concatenated with to colons (__::__).
	<br/>
	In this case the broker matches the given channel only in combination with the given event-name.
	<br/>
	Example: client.on ( "A::alarm" )

3.	Simple external channel assignment:
	-	Start the appropriate application with the option
	<br/>
		__--gepard.channel=&lt;channel-name>__
	<br/>
	or
	-	Set the environment-variable in the scope of the process:
	<br/>
	__export GEPARD_CHANNEL=&lt;channel-name>__

#### Event-emitter

There are 2 different possibilities to emit an event on a channel:

1.	The method __client.setChannel ( <channel-name> )__
	The &lt;channel-name> is of the form: id{,id-2, ... id-n}
	<br/>
	The event can only be sent on one channel the so-called main-channel.
	<br/>
	By default the main-channel is the first in the comma-list of channel-names.
	This may be changed by prefixing the appropriate channel-name with an asterisk (__*__)
	<br/>
	Example: client.setChannel ( "A,B,<b>*</b>C" )
	<br/>
	With this definition the channel __C__ is the main-channel.

2.	Regardless of the client's channel-membership a shortcut for emitting an event on another channel is:
	<br/>
	client.emit ( &lt;channel-name>__::__&lt;event-name> )
	<br/>
	Example: client.emit ( "A**::**alarm" )

3.	Simple external channel assignment:
	-	Start the appropriate application with the option
	<br/>
		__--gepard.channel=&lt;channel-name>__
	<br/>
	or
	-	Set the environment-variable in the scope of the process:
	<br/>
	__export GEPARD_CHANNEL=&lt;channel-name>__

### Channel Examples

Suppose you need access to 2 databases named DB-A and DB-B with different content.
<br/>
It is easy to use the identical client-programs to connect with appropriate credentials and parameters.
<br/>
The 2 micro-services register themselfes with
-	client.setChannel ( "DB-A" )
	<br/>
	client.on ( "db-request" )

	and

-	client.setChannel ( "DB-B" )
	<br/>
	client.on ( "db-request" )

A interested client only needs to know the appropriate channel and requests
-	client.request ( "DB-A::db-request", callback )

	or

-	client.request ( "DB-B::db-request", callback )

<a name="release-1-4-5-registered-event-names-may-contain-wildcards-regexp"></a>
## Release 1-4-5 Registered Event-names may contain Wildcards (RegExp)

Up to now an event-handler is registered with one or more exact event-names, e.g.

```js
client.on ( "config-changed", <function-reference> )
```

Now it is possible to use wildcard pattern for registering a listener, e.g.

```js
client.on ( "*-changed", <function-reference> )
```
In this case all events matching the regular expression __.*-changed__ are routed to this listener.

In general a regular-expression pattern is derived from the given string if it containes some indicators.

1. an __*__ (asterisk) or a __?__ (question-mark)
	<br/>
	Before the regular-expression is compiled the astrisk is replaced by a __.*__ and the __?__ is replced by a __.__ (dot)
1. at least one __.*__
	<br/>
	The whole string is used as is to compile the appropriate regular-expression.
1. the string starts and ends with a slash: __"/A.*/"__
	<br/>
	The string between the slashes is used as is to compile the appropriate regular-expression.

<a name="release-1-4-5-simplified-handling-of-json-trees"></a>
## Release 1-4-5 Simplified Handling of JSON Trees

Creating and editing JSON objects in Python and Java is a little bit unhandy. The class JSAcc in Python, JavaScript and Java simplifies
the handling of these objects.
<br/>
The main methods of this class are:

- jsacc.add ( &lt;path>, object )
- jsacc.get ( &lt;path>, [ &lt;default-return-object> ] )
- jsacc.remove ( &lt;path> )

The &lt;path> is a slash delimited combination of string-keys in the appropriate nodes of the JSON-tree.

Example:

- Python:

```python
e = Event ( "XXX" )
jsacc = JSAcc ( e.getBody() )

type = jsacc.get ( "request/header/type" )
jsacc.remove ( "request" )
jsacc.add ( "result/header/status", True )
```

- JavaScript:

```js
var e = new Event ( "XXX" ) ;
var jsacc = new JSAcc ( e.getBody() ) ;

var type = jsacc.get ( "request/header/type" ) ;
jsacc.remove ( "request" ) ;
jsacc.add ( "result/header/status", true ) ;
```
- Java:

```java
Event e = new Event ( "XXX" ) ;
JSAcc jsacc = new JSAcc ( e.getBody() ) ;

String type = (String) jsacc.get ( "request/header/type" ) ;
jsacc.remove ( "request" ) ;
jsacc.add ( "result/header/status", true ) ;
```

Path-elements which do not exist are created if needed.

<a name="release-1-4-3-logging"></a>
## Release 1-4-3 Logging

- Client Logging into central Log-File on Broker side by calling the method
	<br/>
	__client.log ( {object} o )__
	<br/>
	The above {object} is converted to a user-friendly readable string, sent to the Broker which logs it to the default log-file.
	<br/>
	For all exception type objects an appropriate stack-trace is generated. 
	<br/>

	Examples:
	* JavaScript: [gepard/xmp/XmpLog.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/XmpLog.js)
	* Java: [gepard/java/org.gessinger/gepard/xmp/XmpLog.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/XmpLog.java)
	* Python: [gepard/python/xmp/XmpLog.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/XmpLog.py)

	This function can be rejected by overwriting the system method in the ConnectionHook class.
	<br/>
	Event.getName() is 'system'
	<br/>
	Event.getType() is 'log'

- Logging with the concept of trace-points for Broker in/out and client in/out.
	<br/>
	The TracePoint logging features is configurable at run-time.
	<br/>
	In addition to the built-in TracePoints __EVENT_IN__ and __EVENT_OUT__ on the client-side application-specific trace-points can be easily defined and used:
	<br/>

JavaScript:

```js
	var tracePoint = client.registerTracePoint ( "MY_TRACE_POINT" ) ;
	tracePoint.log ( "Action ended" ) ;
```
Python:

```python
	tracePoint = client.registerTracePoint ( "MY_TRACE_POINT" )
	tracePoint.log ( "Action ended" )
```
Java:

```java
	TracePoint tp = client.registerTracePoint ( "MY_TRACE_POINT" ) ;
	tracePoint.log ( "Action ended" ) ;
```
Each TracePoint can be activated and deactivated at runtime.
This function can be rejected by overwriting the __ConnectionHook.prototype.system(connection,event)__ method in the ConnectionHook class.
Event.getName() is 'system'
Event.getType() is 'log'


<a name="release-1-4-0-new-heartbeat-protocol-to-ensure-the-availability-of-connections"></a>
## Release 1-4-0 New Heartbeat Protocol to ensure the Availability of Connections

Gepard is based on fast communication by means of always-open sockets. Therefore it is crucial to monitor these connections.
This is achieved by a mechanism which exchanges packets between the broker and all connected clients in fixed time intervals defined
by the broker. This interval is transmitted to clients as they connect.

The broker sends a __PING__ message to the connected clients in each interval to which all clients are expected to respond with a __PONG__
message within the three next intervals. If no such response is received by the end of the third interval, the broker closes the connection-socket.

On the other end, after dispatching a __PONG__ message, the client waits for the next __PING__ from the broker to arrive within 3 intervals.
In case the subsequent __PING__ is not received, the client closes the connection socket and emits a __"disconnect"__ event to signal the status to the application.

If the client is configured to re-connect, it will try to establish a new connection to the broker in a pre-defined interval.
On success, the client will emit a __"reconnect"__ event to the application. All gepard-event-listeners which had been registered at the time of disconnect will then automatically be registered
with the broker again.

Example time-out conditions are:

- Broker restart after maintenance
- Backup time of a virtual machine
- Restart of a firewall

[Parameter, details and example](#heartbeat-and-reconnection-capability-parameterization)

<a name="release-1-3-3-new-filecontainer-class-for-python-javascript-and-java-to-simplify-file-transfer"></a>
## Release 1-3-3 New FileContainer class for Python, JavaScript and Java to simplify file-transfer.

An instance of the __FileContainer__ class may be inserted at any place inside the body of an Event.
<br/>
If the client runs on the same machine as the broker only the full path-name of the file will be transferred.
<br/>
If the broker runs on a different machine the content of the file is read in as a byte-array and transferred as payload to the broker.
<br/>
If the broker detects a target on a different machine the file is read in and put into the event's body before sending the data.
<br/>
This is done on a per connection basis.
<br/>
[See details](#file-transfer-with-the-filecontainer-class)

<a name="release-1-3-0-lets-talk-about-python"></a>
## Release 1-3-0 Let's talk about Python

In this release a full featured Python client is included. The implementation is __pure generic Python code__.
The features are:

* emit event
* listen to events
* request / result ( messages )
* semaphores ( synchronously / asynchronously )
* locks

<a name="controlling-connections-and-actions-with-a-hook"></a>
## Controlling Connections and Actions with a Hook

In order to control connections and actions a default hook class is provided:
[ConnectionHook](https://github.com/gessinger-hj/gepard/blob/master/src/ConnectionHook.js)

This class contains several methods which are called in appropriate cases:

```js
connect ( connection )
shutdown ( connection, event )
getInfoRequest ( connection, event )
addEventListener ( connection, eventNameList )
sendEvent ( connection, eventName )
lockResource ( connection, resourceId )
acquireSemaphore ( connection, resourceId )
clientAction ( connection, resourceId )
system ( connection, event )
```
Each of these methods must return an answer wether to allow or reject the corresponding action.
<br/>
The answer must be either a boolean value or a __Thenable__ which means a __Promise__ object of any kind.
<br/>
The default for shutdown is to return a __false__ value if the incoming connection is not from localhost.
In all other cases the default returns a __true__
<br/>
The parameter can be used to test the allowance in a deeper way.
<br/>
For example using a Promise for shutdown enables an asynchronous check with help of a database configuration.
<br/>
To configure this hook a __subclass__ of __ConnectionHook__ must be implemented and defined as user-hook in an JSON configuration file:

```json
{
	"connectionHook": "<path-to-javascript-code>/XmpConnectionHook"
}
```
This hook file is __required__ with the start of the broker.
<br/>
In this case the command to start the broker is:
<br/>
__<pre>gp.broker --config=&lt;full-config-file-name&gt;</pre>__

An example for a user defined hook is the [XmpConnectionHook.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/XmpConnectionHook.js) file:

```js
var util = require ( "util" ) ;
var ConnectionHook = require ( "gepard" ).ConnectionHook ;
var XmpConnectionHook = function()
{
	XmpConnectionHook.super_.call ( this ) ;
};
util.inherits ( XmpConnectionHook, ConnectionHook ) ;
XmpConnectionHook.prototype.connect = function ( connection )
{
	console.log ( "connection.getRemoteAddress()=" + connection.getRemoteAddress() ) ;
	return true ;
};
module.exports = XmpConnectionHook ;
```
If you prefer to start the broker from within your own JavaScript-program the configuration object can be set like:
```js
	var b = new Broker() ;
	b.setConfig ( <config-object or path to config-json-file> ) ;
	b.listen() ;
```
The parameter __connection__ in the above method-signatures is an internal used object with mainly the public useful methods:

1.  connection.isLocalHost()
1.  connection.getRemoteAddress()
1.  connection.getHostName()
1.  connection.getLanguage()
1.  connection.getApplicationName()
1.  connection.getApplication()
1.  connection.getId()

<a name="perfect-load-balanced-message-handling"></a>
## Perfect load balanced message handling.

The use-case for request/respond is enhanced to a perfect load balancing.
<br/>
Suppose there are __n__ message-listeners offering the same service-name ( event-name )
<br/>
__m__ messages come in to the broker with __m__ = __n + 1__
<br/>
The following is done:

1.  the first __n__ messages are sent to the __n__ free listener for processing the request.
1.  the __m-th__ message is stored inside the broker waiting for any of the listeners sending back the response.
1.  after receiving the first message-response from any listener the waiting __m-th + 1__ message is sent to the now free listener.

As long as a sent message is not returned the Broker stores it in relation to the worker connection.
If this connection dies the stored message is sent back to the originator marked with the fail state and appropriate text.
The status can be tested with event.isBad() which returns true or false.

<a name="java-bindings-for-all-features"></a>
## Java bindings for all features:

* emit event
* listen to events
* request / result ( messages )
* semaphores
* locks

With this it is very easy to communicate or synchronize between JavaScript programs or webapps in a browser with a Java server or Java program.

The conversion from JSON to Java and vice versa is done with the Gson Google library for Java.

If you need special serialization / deserialization you may set the appropriate Gson instance in the Event-class statically with the method Event.setGson() ;

The Event-class may convert the json to map Java's byte[]-array to NodeJS's Buffer and vice versa.
This can be set statically by Event.mapByteArrayToJavaScriptBuffer ( boolean state ).
The default is true.


<a name="install"></a>
# Install

__npm install gepard__

or the newest stable but development version:

npm install git+https://github.com/gessinger-hj/gepard

<a name="getting-started"></a>
# Getting Started

Here are some kind of "Hello World" examples.

All commands are in the directory: __node_modules/.bin__ or __node_modules/.bin/gepard__

Up to now the JavaScript and the Java classes are implemented.
<br/>
The examples show the nice and easy interaction between programs written in these different languages.

<a name="base"></a>
## Base
1.  __gp.broker<br/>__
		Start the gepard broker with websocket proxy

1.  __gp.shutdown<br/>__
		Send a __shutdown__ event to all clients an stop the broker

1.  __gp.info<br/>__
		Show basic information from the broker

<a name="javascript"></a>
## JavaScript

1.  __gp.listen --name=hello<br/>__
		Start a listener for events named __hello__
		<br/>
		If you want to listen to all events with name starting with hello use a wildcard:
		<br/>
		__gp.listen "--name=hello*"__

1.  __gp.emit --name=hello__ [--body='{"City":"Frankfurt"}']
		emit an event with name __hello__

1.  __gp.sem__<br/>
		Acquire a semaphore

1.  __gp.lock__<br/>
		Acquire a lock

1.  If you want to play with the web-client implementation use the appropriate files in:
		__node_modules/gepard/xmp/webclient__
<br/>
To simplyfy this the command


```bash
gp.http.simple [options]
```

is supplied starting a simple js webserver detached.
Options are:

* --port=<port&gt;, default=8888
* --root=<web-root&gt;, default=node_modules/gepard/xmp/webclient
* --index=<index-file&gt;, default=index.html

Start your browser and go to: __localhost:8888__

1.  __gp.http.simple.shutdown__<br/>
		Stop the simple webserver.

1.  __gp.http.simple.is.running__<br/>
		Check if the simple webserver is running.

<br/>
In order to try out the examples goto node_modules/gepard/xmp.
<br/>
The following examples exist:

* Listener.js
* Emitter.js
* EmitterWithBody.js
* EmitterWithStatusInfo.js
* Requester.js
* Responder.js
* Locker.js
* AsyncSemaphore.js

<a name="java"></a>
## Java

In order to try out the examples goto node_modules/gepard/java.
All examples are included in lib/Gepard.jar.
With the following command all examples can be executed:

```bash
java [-D<name>=<value>] -cp lib/Gepard.jar:lib/gson-2.3.1.jar org/gessinger/gepard/xmp/Listener
```

__Listener__ may be replaced by:

* Listener
* Emitter
* EmitterWithBody
* EmitterWithStatusInfo
* Requester
* Responder
* Locker
* AsyncSemaphore
* BlockingSemaphore

The class-version in the existing Gepard.jar is 1.6, so you need to have at least java 1.6 installed.
There is an ant file to build your own jar.

Options, e.g. for the event-name must be set in the common Java format: -Dname=hello

<a name="python"></a>
## Python

In order to try out the examples goto node_modules/gepard/python/xmp.

The following examples exist:

* Listener.py
* Emitter.py
* EmitterWithBody.py
* EmitterWithStatusInfo.py
* Requester.py
* Responder.py
* Locker.py
* AsyncSemaphore.py
* BlockingSemaphore.py

<a name="configuration"></a>
# Configuration

The communication is based on sockets. Thus only the port and optional the host must be specified to use Gepard.
The defaults are:

* port=17501
* host=localhost
* web-socket port=17502

The port, host and logging directory can be set either by
supplying these items

1. within creating an instance of Client or Broker in your code.

2. as startup arguments of your program as:
	- -Dgepard.port=<port&gt;
	- -Dgepard.host=<host&gt;
	- -Dgepard.log=<log-dir&gt;

3. with environmant variables of the form:
	- export ( or set ) GEPARD_PORT=<port&gt;
	- export ( or set ) GEPARD_HOST=<host&gt;
	- export ( or set ) GEPARD_LOG=<log-dir&gt;

<a name="use-cases"></a>
# Use Cases

<a name="configuration-changes-events"></a>
## Configuration Changes (Events)

Suppose you have 1 program that changes configuration-entries in a database-table.
After the new entries are committed the program sends an event with:

```js
client.emit ( "CONFIG-CHANGE" ) ;
```

Several clients do their work based on these data.<br/>

All clients including web-clients setup a listener for example with

```js
client.on ( "CONFIG-CHANGE", function callback(e) {} ) ;
```

<a name="concurrent-editing-of-a-dataset-semaphores"></a>
## Concurrent editing of a Dataset (Semaphores)
Two users with their web browser want to edit the same user-data in a database.
In this case a Semaphore is very useful.

<br/>
Both do

```js
gepard.port = 17502 ;
var sem = new gepard.Semaphore ( "user:4711" ) ;
this.sem.acquire ( function sem_callback ( err )
{
	// we are owner
	fetch data, edit and save

	then:

	this.release() ; // with this statement the second user's browser app is callbacked
}) ;
```

<a name="synchronization-of-file-processing-locks"></a>
## Synchronization of file processing (Locks)

Suppose there are many files in a directory waiting to be processed.
<br/>
Let's name the directory: foo/bar/input
<br/>
In order to speed up the overall processing several identical programs should work together.
<br/>
In this case Locks are very useful.
The following should be done:

```js
var fs     = require ( "fs" ) ;
var gepard = require ( "gepard" ) ;
var lock ;

var array = fs.readdirSync ( "foo/bar/input" ) ;
for ( var i = 0 ; i < array.length ; i++ )
{
	lock = new gepard.Lock ( array[i], function()
	{
		try
		{
			if ( ! this.isOwner() ) return ;
			.............. process file ................
		}
		finally
		{
			this.release() ;
		}
	} ) ;
}
```
<a name="a-nice-exotic-mixture-of-programming-languages"></a>
## A Nice Exotic Mixture of Programming Languages

Suppose the following: There are a couple of JavaScript and Python programs to interact with a database. The database changes.
And it would be nice to not change modules for database access.
<br/>
Especially if the new database is an Oracle database. Perhaps on Linux.
<br/>
Everybody who had ever tried to install the appropriate NodeJS or Python module ended up in a mess of build, configuration and installation problems.
<br/>
One of the nicest Java features is the total abstraction of the database handling via the JDBC api.
<br/>
It is clear what to do: Use a Java Gepard client connected to a database and execute all simple REST kind of actions
via request/respond on the basis of Gepard.
<br/>
In this combination changing a database vendor is only a 10 second job changing the connection url and restart the Java client. Ok: another 5 seconds. But that's it.
<br/>
No compilation, no installation no problems.

<a name="the-event-body"></a>
# The Event Body
This member of an event is the holder for all payload-data. In all languages this is a hashtable with the restriction that the key must be
of type string.
<br/>
* Java: __Map&lt;String,Object&gt;__
* JavaScript: __{}__ or in long form: __Object__
* Python: __{}__ which is in fact an object of type __dict__

Setter and getter are the appropriate methods __Event.putValue(name,value)__ and __Event.getValue(name)__.
<br/>
__value__ is either a scalar type, a hashtable with strings as keys and valid object types, a list containing valid object types or a a combination of all valid types.
Thus a set of data like a tree can be used.
<br/>
__Note: Gepard's data exchange mechanism is NOT intended to transport serialized objects between clients.__
<br/>
The valid types are:
* scalar type objects: string, int, double, number
* array type objects:
	- Array ( [] )
	- List ( [] )
* hashtable type objects:
	- Java: Map&lt;String,Object&gt;
	- Python: dict ( {} )
	- JavaScript: Object ( {} )

There are 2 type of objects which are treated by gepard in a special way:
* dates
	- JavaScript: Date
	- Java: Date
	- Python: datetime.datetime
* bytes
	- JavaScript: Buffer
	- Java: byte[]
	- Python: bytearray, bytes ( bytes should not be used to send because in python < 3 bytes is a subclass of str, typeof byte == 'str'
		and thus cannot be detected by this mechanism)

In these cases an object is transferred from a generic class of a sender to the generic class of the receiver which means it is reconstructed in the target programming language.
<br/>
__Note on Python:__
<br/>
The built-in date class in python is not able to parse or format ISO date strings. In order to enable full interoperability related to dates
the gapard module tries to import the well known __dateutils__ module. This in turn imports the __six__ module. If these modules are in
python's module path the generic python date class can be used.
<br/>
Details in:

* JavaScript: [gepard/xmp/EmitterWithBody.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/EmitterWithBody.js)
* Java: [gepard/java/org.gessinger/gepard/xmp/EmitterWithBody.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/EmitterWithBody.java)
* Python: [gepard/python/xmp/EmitterWithBody.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/EmitterWithBody.py)

<a name="examples"></a>
# Examples

Ready to use examples for JavaScript are located in __.../gepard/xmp__
<br/>
Ready to use examples for Java are located in __.../gepard/gepard/java/org.gessinger/gepard/xmp__ and compiled in
__.../gepard/java/lib/Gepard.jar__
<br/>
Ready to use examples for Python are located in __.../gepard/python/xmp__

<a name="examples-short"></a>
## Examples Short

### Event listener

Adding a event-listener with the __on()__ method may be done with a single event-name or a list of event-names.

__JavaScript__: client.on ( "ALARM", callback )
	 <br/> or client.on ( [ "ALARM", "BLARM" ], callback )

__Java__: client.on ( "ALARM", callback )
 <br/>or client.on ( new String[] { "ALARM", "BLARM" }, callback )

__Python__: client.on ( "ALARM", callback )
<br/>or client.on ( [ "ALARM", "BLARM" ], callback )

The callback will be called with an Event object of the appropriate name ( e.getName() )


Application

```js
	var gepard = require ( "gepard" ) ;
	var client = gepard.getClient() ;
```
Browser

```js
	var client = gepard.getWebClient ( 17502[, host] ) ;
```

Code

```js
client.on ( "ALARM", function event_listener_callback(e)
{
	console.log ( e.toString() ) ;
});
```

Java

```java
import org.gessinger.gepard.Client ;
import org.gessinger.gepard.EventListener ;
import org.gessinger.gepard.Event ;
Client client = Client.getInstance() ;

client.on ( "ALARM", new EventListener()
{
	public void event ( Event e )
	{
		System.out.println ( e ) ;
	}
} ) ;
```

Python

```python
import gepard
client = gepard.Client.getInstance()

def on_ABLARM ( event ):
	print ( "on_ALARM" )
	print ( event )

client.on ( "ALARM", on_ABLARM )
```

Details in:

* JavaScript: [gepard/xmp/Listener.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/Listener.js)
* Java: [gepard/java/org.gessinger/gepard/xmp/Listener.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/Listener.java)
* Python: [gepard/python/xmp/Listener.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/Listener.py)

### Event Emitter

Application

```js
var gepard = require ( "gepard" ) ;
var client = gepard.getClient() ;
client.emit ( "ALARM",
{
	var thiz = this ;
	write: function()
	{
		thiz.end() ; // close connection after written
	}
});
```

Browser

```js
var client = gepard.getWebClient ( 17502[, host] ) ;
client.emit ( "CONFIG-CHANGED" ) ;
```

Java

```java
import org.gessinger.gepard.Client ;
Client client = Client.getInstance() ;
client.emit ( "ALARM" ) ;
```

Python

```python
import gepard
client = gepard.Client.getInstance()
client.emit ( "ALARM" )
```

Details in:

* JavaScript: [gepard/xmp/Emitter.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/Emitter.js)
* JavaScript: [gepard/xmp/EmitterWithStatusInfo.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/EmitterWithStatusInfo.js)
* JavaScript: [gepard/xmp/EmitterWithBody.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/EmitterWithBody.js)
* Java: [gepard/java/org.gessinger/gepard/xmp/Emitter.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/Emitter.java)
* Java: [gepard/java/org.gessinger/gepard/xmp/EmitterWithStatusInfo.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/EmitterWithStatusInfo.java)
* Java: [gepard/java/org.gessinger/gepard/xmp/EmitterWithBody.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/EmitterWithBody.java)
* Python: [gepard/python/xmp/Emitter.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/Emitter.py)
* Python: [gepard/python/xmp/EmitterWithStatusInfo.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/EmitterWithStatusInfo.py)
* Python: [gepard/python/xmp/EmitterWithBody.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/EmitterWithBody.py)

### Locks

Application

```js
	var gepard = require ( "gepard" ) ;
	var lock = new gepard.Lock ( "resid:main" ) ;
```
Browser

```js
gepard.port = 17502 ;
var lock = new gepard.Lock ( "resid:main" ) ;
```
Code

```js
lock.acquire ( function ( err )
{
	console.log ( this.toString() ) ;
	if ( this.isOwner() )
	{
		.........
		this.release() ;
	}
} ) ;
```

Java

```java
import org.gessinger.gepard.Lock ;
Lock lock = new Lock ( "resid:main" ) ;
lock.acquire() ;
if ( lock.isOwner() )
{
	.........
	lock.release() ;
}
```

Python

```python
import gepard

lock = gepard.Lock ( "resid:main" )
lock.acquire()

if lock.isOwner():
	......................
	lock.release()

```

Details in:

* JavaScript: [gepard/xmp/Locker.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/Locker.js)
* Java: [gepard/java/org.gessinger/gepard/xmp/Locker.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/Locker.java)
* Python: [gepard/python/xmp/Locker.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/Locker.py)


### Semaphores

Application

```js
	var gepard = require ( "gepard" ) ;
	var sem = new gepard.Semaphore ( "user:4711" ) ;
```
Browser

```js
gepard.port = 17502 ;
var sem = new gepard.Semaphore ( "user:4711" ) ;
```

Code

```js
sem.acquire ( function ( err )
{
	console.log ( this.toString() ) ;

		.....................

	this.release() ;
} ) ;
```

Java

Asynchronously

```java
import org.gessinger.gepard.Semaphore ;
import org.gessinger.gepard.SemaphoreCallback ;
final Semaphore sem = new Semaphore ( "user:4711" ) ;
sem.acquire ( new SemaphoreCallback()
{
	public void acquired ( Event e )
	{
		System.out.println ( sem ) ;
		.....................
		sem.release() ;
	}
}) ;
```

Synchronously

```java
import org.gessinger.gepard.Semaphore ;
final Semaphore sem = new Semaphore ( "user:4711" ) ;
// with or without a timeout
sem.acquire(5000) ;

if ( sem.isOwner() ) // if not timeout occured
{
		.....................
	sem.release() ;
}
```

Python

Asynchronously

```python
import gepard

def on_owner(sem):
	................
	sem.release()

sem = gepard.Semaphore ( "user:4711" )
sem.acquire ( on_owner )
```

Synchronously

```python

import gepard

sem = gepard.Semaphore ( name )

sem.acquire ( 5 ) # with or without a timeout

if sem.isOwner():
	...........
	sem.release()
```

Details in:

* JavaScript: [gepard/xmp/AsyncSemaphore.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/AsyncSemaphore.js)
* Java: [gepard/java/org.gessinger/gepard/xmp/AsyncSemaphore.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/AsyncSemaphore.java)
* Java: [gepard/java/org.gessinger/gepard/xmp/AsyncSemaphore.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/BlockingSemaphore.java)
* Python: [gepard/python/xmp/AsyncSemaphore.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/AsyncSemaphore.py)
* Python: [gepard/python/xmp/BlockingSemaphore.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/BlockingSemaphore.py)

### Request / Result

#### Send request

Application:

```js
	var gepard = require ( "gepard" ) ;
	var client = gepard.getClient() ;
```
Browser:

```js
	var client = gepard.getWebClient ( 17502[, host] ) ;
```
Code:

```js
client().request ( "getFileList"
, function result(e)
	{
		console.log ( e.getBody().list ) ;
		this.end() ;
	});
```

Java

```java
import org.gessinger.gepard.Client ;
import org.gessinger.gepard.ResultCallback ;
import org.gessinger.gepard.Util ;
import java.util.List ;
final Client client = Client.getInstance() ;
client.request ( "getFileList", new ResultCallback()
{
	public void result ( Event e )
	{
		if ( e.isBad() )
		{
			System.out.println ( "e.getStatusReason()=" + e.getStatusReason() ) ;
		}
		else
		{
			List<String> list = (List<String>) e.getBodyValue ( "file_list" ) ;
			System.out.println ( Util.toString ( list ) ) ;
		}
		client.close() ;
	}
}) ;

```

Python

```python
import gepard

client = gepard.Client.getInstance()

def getFileList ( e ):
	if e.isBad():
		print ( e.getStatusReason() )
	else:
		print ( e.getValue ( "file_list" ) )
	e.getClient().close()

client.request ( "getFileList", getFileList )

```

Details in:

* JavaScript: [gepard/xmp/Requester.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/Requester.js)
* Java: [gepard/java/org.gessinger/gepard/xmp/Requester.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/Requester.java)
* Python: [gepard/python/xmp/Requester.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/Requester.py)

#### Send result

Application:

```js
	var gepard = require ( "gepard" ) ;
	var client = gepard.getClient() ;
```
Browser:

```js
	var client = gepard.getWebClient ( 17502[, host] ) ;
```
Code:

```js
var list = [ "one.js", "two.js", "three.js" ] ;
client.on ( "getFileList", function ( e )
{
	e.getBody().list = list ;
	e.sendBack() ;
});
```

Java

```java
import org.gessinger.gepard.Client ;
import org.gessinger.gepard.EventListener ;
import org.gessinger.gepard.Event ;
final Client client = Client.getInstance() ;
client.on ( name, new EventListener()
{
	public void event ( Event e )
	{
		String[] fileList = new String[] { "a.java", "b.java", "c.java" } ;
		e.putBodyValue ( "file_list", fileList ) ;
		e.sendBack() ;
	}
} ) ;
```

Python

```python
import gepard
client = gepard.Client.getInstance()

fileList = [ "a.py", "b.py", "c.py" ] ;
def on_getFileList ( event ):
	print ( "Request in" ) ;
	print ( "File list out:" ) ;
	print ( fileList ) ;
	event.body["file_list"] = fileList ;
	event.sendBack() ;

client.on ( "getFileList", on_getFileList )
```

Details in:

* JavaScript: [gepard/xmp/Responder.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/Responder.js)
* Java: [gepard/java/org.gessinger/gepard/xmp/Responder.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/Responder.java)
* Python: [gepard/python/xmp/Responder.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/Responder.py)

<a name="examples-long"></a>
## Examples Long

### Event listener

#### In Application

```js
var gepard = require ( "gepard" ) ;
var c = gepard.getClient() ;

var eventName = "ALARM" ;
console.log ( "Listen for events with name=" + eventName ) ;
c.on ( eventName, function(e)
{
	console.log ( e ) ;
});
c.on('end', function()
{
	console.log('socket disconnected');
});
c.on('error', function ( event)
{
	console.log( event );
});
c.on('shutdown', function()
{
	console.log('broker shut down');
});
```

#### In Browser

```html
<script type="text/javascript" src="Event.js" ></script>
<script type="text/javascript" src="MultiHash.js" ></script>
<script type="text/javascript" src="GPWebClient.js" ></script>
```

```js
		var wc = gepard.getWebClient ( 17502 ) ;
		this.wc.on ( "open", function onopen()
		{
		}) ;
		this.wc.on ( "error", function onerror()
		{
		}) ;
		this.wc.on ( "close", function onclose()
		{
		}) ;
		wc.on ( "ALARM", function event_listener_callback ( e )
		{
			console.log ( e.toString() ) ;
		}) ;
```

### Event Emitter

#### In Application

```js
var gepard  = require ( "gepard" ) ;
var c = gepard.getClient() ;

var event = new gepard.Event ( "CONFIG-CHANGED" ) ;
event.setBody ( { "config-name" : "app.conf" } ) ;
c.emit ( event,
{
	write: function() // close connection after write
	{
		c.end() ;
	}
});
```
#### In Browser

```html
<script type="text/javascript" src="Event.js" ></script>
<script type="text/javascript" src="MultiHash.js" ></script>
<script type="text/javascript" src="GPWebClient.js" ></script>
```

```js
var wc = gepard.getWebClient ( 17502 ) ;
var event = new gepard.Event ( "CONFIG-CHANGED" ) ;
event.setBody ( { "config-name" : "app.conf" } ) ;
wc.emit ( event ) ;
```

<a name="file-transfer-with-the-filecontainer-class"></a>
# File Transfer with the FileContainer Class

The basic usage of this class is as follows:

<a name="filesender"></a>
## FileSender

JavaScript:
<br/>See also: [gepard/xmp/FileSender.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/FileSender.js)


```js
var gepard  = require ( "gepard" ) ;
var client = gepard.getClient() ;
var event = new gepard.Event ( "__FILE__" ) ;
var file = "<full-file-name>" ;
event.putValue ( "DATA", new gepard.FileContainer ( file ) ) ;
client.request ( event, function ( e )
{
	if ( e.isBad() )
	{
		console.log ( e.getStatus() ) ;
	}
	else
	{
		console.log ( "File " + file + " sent successfully." )
	}
	this.end() ;
}) ;
```

Python:
<br/>See also: [gepard/python/xmp/FileSender.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/FileSender.py)

```python
client = gepard.Client.getInstance()

event = gepard.Event ( "__FILE__" )

file = "<full-file-name>" ;
event.putValue ( "DATA", gepard.FileContainer ( file ) )

def result ( e ):
	if e.isBad():
		print ( e.getStatusReason() )
	else:
		print ( "File " + file + " sent successfully." )
	e.getClient().close()

print ( "Sending " + file )
client.request ( event, result )
```
Java:
<br/>See also: [gepard/java/org.gessinger/gepard/xmp/FileSender.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/FileSender.java)

```java
		final Client client = Client.getInstance() ;

		Event event = new Event ( "__FILE__" ) ;
		final String file = "<full-file-name>"
		event.putValue ( "DATA", new FileContainer ( file ) ) ;
		client.request ( event, new ResultCallback()
		{
			public void result ( Event e )
			{
				if ( e.isBad() )
				{
					System.out.println ( e ) ;
				}
				else
				{
					System.out.println ( "File " + file + " sent successfully." ) ;
					System.out.println ( "code: " + e.getStatusCode() );
					System.out.println ( "name: " + e.getStatusName() );
					System.out.println ( "reason: " + e.getStatusReason() );
				}
				client.close() ;
			}
		}) ;
```

<a name="filereceiver"></a>
##FileReceiver

JavaScript:
<br/>See also: [gepard/xmp/FileReceiver.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/FileReceiver.js)

```js
	var client = gepard.getClient() ;
	client.on ( "__FILE__", function(e)
	{
		var data = e.removeValue ( "DATA" ) ;
		console.log ( data.getName() + " received." ) ;
		var fname = data.getName() + ".in" ;
		try
		{
			data.write ( fname ) ;
			console.log ( fname + " written." ) ;
		}
		catch ( exc )
		{
			e.control.status = { code:1, name:"error", reason:"could not write: " + fname } ;
			console.log ( exc ) ;
		}
		e.sendBack() ;
	});
```

Python:
<br/>See also: [gepard/python/xmp/FileReceiver.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/FileReceiver.py)

```py
client = gepard.Client.getInstance()

def on___FILE__ ( e ):
	data = e.removeValue ( "DATA" )
	print ( data.getName() + " received." ) ;
	fname = data.getName() + ".in"
	try:
		data.write ( fname ) ;
		print ( fname + " written.")
	except Exception as exc:
		print ( exc )
	e.sendBack() ;

client.on ( "__FILE__", on___FILE__ )
```
Java:
<br/>See also: [gepard/java/org.gessinger/gepard/xmp/FileReceiver.java](https://github.com/gessinger-hj/gepard/blob/master/java/src/org/gessinger/gepard/xmp/FileReceiver.java)

```java
final Client client = Client.getInstance() ;
client.on ( "__FILE__", new EventListener()
{
	public void event ( Event e )
	{
		try
		{
			FileContainer fileContainer = (FileContainer) e.removeValue ( "DATA" ) ;
			String fname = fileContainer.getName() + ".in" ;
			fileContainer.write ( fname ) ;
			System.out.println ( fname + " written." );
			e.setStatus ( 0, "success", "File accepted." ) ;
		}
		catch ( Exception exc )
		{
			e.setStatus ( 1, "error", "File not saved." ) ;
			System.out.println ( Util.toString ( exc ) ) ;
		}
		try
		{
			e.sendBack() ;
		}
		catch ( Exception exc )
		{
			System.out.println ( Util.toString ( exc ) ) ;
		}
	}
} ) ;

```

<a name="heartbeat-and-reconnection-capability-parameterization"></a>
# Heartbeat and Reconnection Capability Parameterization

<a name="broker-side"></a>
## Broker Side

The default ping interval for the broker is 180000 milli-sec or 3 minutes. This value can be changed in different ways:

1.  Startup parameter: --gepard.heartbeat.millis=&lt;nnn>
1.  Evironment variable: GEPARD_HEARTBEAT_MILLIS=&lt;nnn>
1.  Variable in configuration-file: { "heartbeatMillis":&lt;nnn> }
1.  In program: broker.setHeartbeatMillis ( &lt;nnn> )

<a name="client-side"></a>
## Client Side

The default is reconnect=false

 This value can be changed in different ways:
 
1.  Startup parameter: --gepard.reconnect=true
1.  environment variable: export GEPARD_RECONNECT=true
1.  client.setReconnect ( true ) before any socket connection is active
1.  gepard.setProperty ( 'gepard.reconnect', 'true' )

If the boker is shut down all clients receive a __shutdown event__.
If __reconnect==true__ the appropriate callback in the client is called and the client api tries to reconnect.
<br/>
At this place a call to __client.setReconnect(false|False)__ initiates a Client-shutdown without reconnection.
<br/>
There are two new callbacks available signaling the state-change to the owner-application:

* Java
	1.  client.onReconnect ( InfoCallback icb )
	1.  client.onDisconnect ( InfoCallback icb )

* Python
	1.  client.onReconnect ( &lt;callback> )
	1.  client.onDisconnect ( &lt;callback> )

* JavaScript
	1.  client.on ( "reconnect", &lt;callback> )
	1.  client.on ( "disconnect", &lt;callback> )

### Example to test

1.  open a terminal, execute: node_modules/.bin/gp.broker or node node_modules/gepard/src/Broker.js
1.  open a terminal, execute: node node_modules/gepard/xmp/Listener.js
1.  open a terminal, execute: python node_modules/gepard/python/xmp/Listener.py
1.  open a terminal, goto node_modules/gepard/java
		<br/> execute: java -cp lib/Gepard.jar:lib/gson-2.3.1.jar org.gessinger.gepard.xmp.Listener

Then goto terminal one and kill the Broker either with ^C ( ctrl+C ) or with kill -9 &lt;pid> or with the taskmanger on windows. 
<br/>
Appropriate output is visible.
<br/>
Then start the Broker again and all clients reconnect again. Check with gp.info that all event-listener are registered again.

<a name="the-tracepoint-concept"></a>
# The TracePoint Concept

TracePoints or short __TP__ are used to monitor a data flow at specific places in an application. The combination of all traced-data
helps to analyze and control the behaviour especially within a distributed system..
<br/>
It is very important to use these TracePoints immediately in a running system without changing static configuration
and system-restart.
<br/>
All defined TracePoints in a Gepard-based distributed application can be switched on/off and reconfigured at runtime on behalf of the Admin programm.
TracePoint commands are sent to the running Broker and forwarded to all or selected clients.

<a name="tracepoints-in-the-broker"></a>
## TracePoints in the Broker

There are 2 predefined __TPs__ in the Broker. Each TP in the context of a program has a unique name to address commands to.
<br/>

1.  __EVENT_IN__
	If this TP is switched on all incoming events are logged to the Broker's log-file.
1.  __EVENT_OUT__
	If this TP is switched on all outgoing events are logged to the Broker's log-file.

The status of these __TPs__ can be viewed with the command: __gp.tplist__
<br/>
The output reads as:
```js
{ tracePointStatus:
	 { name: 'broker',
		 list:
			[ { name: 'EVENT_IN', active: false },
				{ name: 'EVENT_OUT', active: false } ],
		 output: 'local' } }
```
Switching the __TPs__ is done with the commands:

- __gp.tpon__ [ &lt;tp-name> { , &lt;tp-name> }] 
	switch on all or given __TPs__
- __gp.tpoff__ [ &lt;tp-name> { , &lt;tp-name> }] 
	switch off all or given __TPs__
- __gp.tp__
	toggle all __TPs__

In all cases the current status of the __TPs__ is shown.

<a name="tracepoints-in-the-client"></a>
## TracePoints in the Client

There are 2 predefined __TPs__ in each client. Each TP in the context of a program has a unique name to address commands to.
<br/>

1.  __EVENT_IN__
	If this TP is switched on all incoming events are logged.
1.  __EVENT_OUT__
	If this TP is switched on all outgoing events are logged.

The status of these __TPs__ can be viewed with the command: __gp.client.tplist__
<br/>
The output reads as:

```js
{ tracePointStatus:
	 { name: 'broker',
		 list:
			[ { name: 'EVENT_IN', active: false },
				{ name: 'EVENT_OUT', active: false } ],
		 output: 'local' } }
```

Switching the __TPs__ is done with the commands:

- __gp.client.tpon__ [ &lt;tp-name> { , &lt;tp-name> }] [ --output=remote|local ] [ --sid=&lt;sid-of-specific-client> ]
	<br/>
	switch on all or given TPs
	<br/>
	optional: direct output to local or remote to the Broker.
- __gp.client.tpoff__ [ &lt;tp-name> { , &lt;tp-name> }]  [ --output=remote|local ] [ --sid=&lt;sid-of-specific-client> ]
	<br/>
	switch off all or given TPs
	<br/>
	optional: direct output to local or remote to the Broker.
- __gp.client.tp__  [ --output=remote|local ] [ --sid=&lt;sid-of-specific-client> ]
	<br/>
	toggle all TPs
	<br/>
	optional: direct output to local or remote to the Broker.

In all cases the current status of the __TPs__ is shown.

Examples with 2 clients:
- __gp.client.tplist__

```js
{ tracePointStatus:
	 { name: 'client',
		 list:
			[ { name: 'EVENT_IN', active: false },
				{ name: 'EVENT_OUT', active: false },
		 output: 'local' },
	sid: '::ffff:127.0.0.1_44109_1452621748330',
	applicationName: 'Listener' }
{ tracePointStatus:
	 { name: 'client',
		 list:
			[ { name: 'EVENT_IN', state: false },
				{ name: 'EVENT_OUT', state: false } ],
		 output: 'local' },
	sid: '::ffff:127.0.0.1_44246_1452621873697',
	applicationName: 'org.gessinger.gepard.xmp.Listener' }
```
- __gp.client.tplist --sid=::ffff:127.0.0.1_44246_1452621873697__

```js
{ tracePointStatus:
	 { name: 'client',
		 list:
			[ { name: 'EVENT_IN', state: false },
				{ name: 'EVENT_OUT', state: false } ],
		 output: 'local' },
	sid: '::ffff:127.0.0.1_44246_1452621873697',
	applicationName: 'org.gessinger.gepard.xmp.Listener' }
```

- __gp.client.tp --sid=::ffff:127.0.0.1_44246_1452621873697 --output=remote__

```js
{ tracePointStatus:
	 { name: 'client',
		 list:
			[ { name: 'EVENT_IN', state: true },
				{ name: 'EVENT_OUT', state: true } ],
		 output: 'remote' },
	sid: '::ffff:127.0.0.1_44246_1452621873697',
	applicationName: 'org.gessinger.gepard.xmp.Listener' }
```

<a name="zeroconf-usage-in-detail"></a>
# Zeroconf Usage in Detail

<a name="zeronconf-on-the-brokers-side"></a>
## Zeronconf on the Broker's Side

If configured the gepard Broker publishes a service in the local subnet and can be discovered by any interested client.
<br/>
The fully qualified domain name (FQDN) for the service consists out of 3 parts:

1.	name, e.g. __Broker__

1.	type, e.g. __gepard__

1.	protocol, **tcp.local**

The FQDN is derived from this parameters as: __Broker._gepard._tcp.local__
<br/>
This name and type can be defined by

1.	an entry in the broker's json config
<br/>
	The form is either a comma separated list like

	```js
	{
		"zeroconf": [<name>,]<type> [ ,<port>|0]
	}
	```
	or
	```js
	{
		"zeroconf": { "name":<name> , "type": <type> [ , "port": <port>|0] }
	}
	```
1.	a startup parameter of the form: --gepard.zeroconv=[&lt;name>,]&lt;type>[,&lt;port>]

1.	an environment variable of the form:
		export GEPARD_ZEROCONF=[&lt;name>,]&lt;type>[,&lt;port>]

1.	calling the method
		broker.setZeroconfParameter ( [&lt;name>,]&lt;type> [ ,&lt;port>] )

If only the &lt;type> is given the &lt;name> is choosen to be:
```js
Gepard-[H:<hostname>]-[P:<port>]
```

This postfix __-[H:&lt;hostname>]-[P:&lt;port>]__ is always appended to make the name unique.
<br/>
If the &lt;port> is not given the standard definitions are used.
If the port is __exactly 0__ a random free port is choosen. Thus no special arrangement is needed for running several brokers on one machine.
The __TXT__ segment contains a comma-list of all registered event-names as TOPIC entry and a comma-list of all channels as CHANNELS entry.
With this an interested client can choose a a Broker depending on this information e.g. with the methods

*	service.topicExists(&lt;topic-name&gt;) and

* service.channelExists(&lt;channel-name&gt;)

This convention is expanded because of the lack of proper parsing the __TXT__ segment of the advertised service in the python zeroconf-module.
In addition to the __TXT__ segment the advertised service-name contains the comma-lists of topics and channels if given.
The format is:

[T:topic1,topic2,...] and [C:channel1,channel2,...]

With this information a client can make a profound decision whether to connect to a found broker or ignore it and search another instance.

<a name="zeroconf-on-the-clients-side"></a>
## Zeroconf on the Client's Side

Up to now only the JavaScript and Python flavors works out of the box. There is no reliable pure Java implementation available.

Suppose the broker is started with __test-gepard,0__. (service-type is test-gepard and port is arbitrary)

```js
gp.broker --gepard.zeroconf=test-gepard,0
```

<br/>
An interested listener would do the following:

__JavaScript__

```js
var gepard = require ( "gepard" ) ;
var client = gepard.getClient ( { type: 'test-gepard' }, function acceptService ( service )
{
	// optional e.g.: ignore service which is not on localhost with:
	// if ( ! service.isLocalhost() ) return false ;
	return true ;
} ) ;
client.setReconnect ( true ) ; // This is for re-connect if broker dies.
                               // in this case the above function <b>acceptService</b> is re-used.
client.on ( "ALARM", (e) => console.log ( e ) ) ; // The "ALARM" listener is registered.
```

or simpler:

```js
var client = gepard.getClient ( 'test-gepard' ) ;
client.setReconnect ( true ) ;
client.on ( "ALARM", (e) => console.log ( e ) ) ;
```

Example: [ZeroconfListener.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/ZeroconfListener.js)

__Python__
```py
import gepard

def acceptService ( client, service ):
	# optional e.g.: ignore service which is not on localhost with:
	# if not service.isLocalhost() return False
	return True

def on_ALARM ( event ):
	print ( event )

client = gepard.Client.getInstance('test-gepard',acceptService)
client.setReconnect ( True )
client.on ( "ALARM", on_ALARM )
```

or simpler:

```py
def on_ALARM ( event ):
	print ( event )
gepard.Client.getInstance('test-gepard').setReconnect ( True ).on ( "ALARM", on_ALARM )
```

Example: [ZeroconfListener.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/ZeroconfListener.py)

If a client uses no connection parameter it can be parametrised by

*	start-parameter: --gepard.zeroconf.type=[__localhost__:]&lt;type> or

*	environment-parameter: export GEPARD_ZEROCONF_TYPE=[__localhost__:]&lt;type>

__localhost:__ is optional and indicates to include only Broker running on the same host.

In this case the code to write is minimal:

__JavaScript__

```js
var client = gepard.getClient() ;
client.setReconnect ( true ) ;
client.on ( "ALARM", (e) => console.log ( e ) ) ;
```
__Python__

```py
def on_ALARM ( event ):
	print ( event )

client = gepard.Client.getInstance()
client.setReconnect ( True )
client.on ( "ALARM", on_ALARM )
```

Thus the behaviour of a client can be easily changed with only external parameters without
any code-change.
<br/>

An interested emitter would do the following:

__JavaScript__

```js
var gepard = require ( "gepard" ) ;
var client = gepard.getClient ( 'test-gepard', function acceptService ( service )
{
	if ( service.getTopics().indexOf ( "ALARM" ) < 0 ) // ignore if listener does not exist
	{
		return ;
	}
	client.emit ( "ALARM",
	{
	  write: function() // The event is sent -> end connection and exit
	  {
	    client.end() ;
	  }
	});
	return true ;
} ) ;
```
__Python__
```py
def acceptService ( client, service ):
	print ( service )
	if service.isLocalHost():
		client.emit ( "ALARM" )
		client.close()
		return True
	return False

client = gepard.Client.getInstance ( 'test-gepard', acceptService )
```

or with external parametrisation use simply the simple Emitter.py in python/xmp and start it as:
```py
python Emitter.py --gepard.zeroconf.type=test-gepard
```

Example: [ZeroconfEmitter.js](https://github.com/gessinger-hj/gepard/blob/master/xmp/ZeroconfEmitter.js),[ZeroconfEmitter.py](https://github.com/gessinger-hj/gepard/blob/master/python/xmp/ZeroconfListener.py)
<br/>

If no timout is specified the service lookup never ends if no valid broker is found.
<br/>
If a listener connects a broker renews its service advertisement. This leads to a recall of the
interested client-callback and the event can be sent.

The optional timout in milli-seconds is given as:

var client = gepard.getClient ( <b>{ timeout:10000, type:'test-gepard' }</b>, &lt;callback> )

The __service__ ([JavaScript](https://github.com/gessinger-hj/gepard/blob/master/src/Service.js),[Python](https://github.com/gessinger-hj/gepard/blob/master/python/gepard.py)) parameter can be used to get

*	service.getTopics()
<br/>
	list of registered event-names
*	service.getChannels()
<br/>
	list of registered channels
*	service.getHost()
<br/>
	host-name where the found broker is running.
*	service.isLocalHost()
<br/>
	whether the found broker is on the same host as the client.

If the client is configured to reconnect automatically in case the broker dies all existing event-names are re-registered upon
connection to another discovered broker.
<br/>
This service- / broker-lookup is done as soon as the old broker has gone.
<br/>
__Conclusion: The set-up with one broker is no more a single point of failure.__
<br/>
In case of broker-failure all clients search another broker and register their listeners automatically.
<br/>
The method gepard.findService ( { type:&lt;type> }, callback ) can be used to discover all services in the subnet of given type.
If the callback returns true the search ends.
<br/>
To monitor services the file MDNSLookup.js can be used.
<br/>
Example to find any service for a given type:

```js
gepard.findService ( { type:<type> }, (service) => {
	if ( service.host === os.hostname() )
	{
		console.log ( service ) ;
	  return true ;
	});
```


<a name="technical-aspects-of-the-client"></a>
# Technical Aspects of the Client

NodeJS clients use the powerful but simple framework for asynchronously callbacks.
<br/>
In Java and Python this asynchronicity is modeled by threads. There is a single thread reading from the socket connected to the Broker.
Incoming events are dispatched and the appropriate callbacks are executed. The main thread is not affected.
<br/>
Thus any number of event listener may be registered or removed in the main thread.
<br/>
Synchronous callbacks are needed with Locks and Semaphores. In this case an id-based blocking message queue
is used for communication between the threads.
<br/>
Incoming events for asynchronous processing are propagated to separate running worker threads via a blocking fifo queue. Thus callbacks do not block each other. This applies to Java and Python.
<br/>
By default 2 threads are running. This can be changed with the method Client.setNumberOfCallbackWorker(). Maximum is 10.
<br/>
From this it is clear that all callback methods run in the context of one of the internal worker-threads and __not__ in the context of the main thread.
<br/>
Per default the internal thread is not a daemon thread. If needed this can be changed by calling the method
- Python: Client.setDaemon([True|False])
- Java: Client.setDaemon([true|false])

before the first action on a Client instance because the internal thread is started when the first connection is needed.

<a name="found-a-bug-help-us-fix-it"></a>
# Found a bug? Help us fix it...

We are trying our best to keep Gepard as free of bugs as possible, but if you find a problem that looks like a bug to you please follow these steps to help us fix it...

* Update Gepard and make sure that your problem also appears with the latest version of Gepard.

* Goto the [issue tracker](https://github.com/gessinger-hj/gepard/issues) to see if your problem has been reported already.
	If there is no existing bug report, feel free to create a new one. If there is an existing report, but you can give additional information,
	please add your data to this existing issue. If the existing issue report has already been closed,
	please only re-open it or comment on it if the same (or a closely related issue) re-appears,
	i.e., there is a high chance that the very same bug has re-appeared. Otherwise, create a new issue report.

* Whenever you create a new issue report in our issue tracker, please make sure to include as much information as possible like
	exceptions with text and stack trace or other log information.
	<br/>
	Having all the required information saves a lot of work.

<a name="httpsgithubcomgessinger-hjgepardblobmasterchangelogmd"></a>
#
https://github.com/gessinger-hj/gepard/blob/master/CHANGELOG.md

<a name="contributors"></a>
# Contributors
- Hans-Jürgen Gessinger
- Paul Gessinger

<a name="features"></a>
# Features
* High performance
* Minimal configuration with
	- __GEPARD_PORT__
	- __GEPARD_HOST__
* All JavaScript client features like event listener, event emitter, semaphores, locks and messages
	are available in any web-browser apps.
* All client features are also available for Java and Python

<a name="changelog"></a>
# Changelog
See [change log details](https://github.com/gessinger-hj/gepard/blob/master/CHANGELOG.md)
