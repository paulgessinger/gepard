var net           = require('net');
var os            = require('os');
var EventEmitter  = require ( "events" ).EventEmitter ;
var util          = require ( "util" ) ;
var fs            = require ( "fs" ) ;
var Path          = require ( "path" ) ;

var T             = require ( "./Tango" ) ;
var Event         = require ( "./Event" ) ;
var MultiHash     = require ( "./MultiHash" ) ;
var Log           = require ( "./LogFile" ) ;
var User          = require ( "./User" ) ;
var FileContainer = require ( "./FileContainer" ) ;
var TracePoints   = require ( "./TracePoints" ) ;
var ActionCmd     = require ( "./ActionCmd" ) ;
var Service       = require ( "./Service" ) ;

var counter = 0 ;

var TPStore = TracePoints.getStore ( "client" ) ;
TPStore.add ( "EVENT_IN" ).setTitle ( "--------------------------- EVENT_IN ---------------------------" ) ;
TPStore.add ( "EVENT_OUT" ).setTitle ( "--------------------------- EVENT_OUT --------------------------" ) ;

var Stats = function()
{
  this.sum = { out: 0, in:0 } ;
  this.bytes = { out: 0, in:0 } ;
  this.calls = { out: 0, in:0 } ;
};
Stats.prototype =
{
  toString: function()
  {
    return "(Stats)[bytes-in=" + this.bytes.in
         + "\n,bytes-out=" + this.bytes.out
         + "\n]"
         ;
  },
  clear: function()
  {
    this.calls.out = 0 ;
    this.calls.in = 0 ;
    this.bytes.out = 0 ;
    this.bytes.in = 0 ;
  },
  incrementOut: function ( n )
  {
    this.calls.out += 1 ; 
    this.sum.out += n ; 
    this.bytes.out += n ; 
  },
  incrementIn: function ( n )
  {
    this.calls.in += 1 ;
    this.sum.in += n ;
    this.bytes.in += n ;
  }
};
/**
 * @constructor
 * @extends    EventEmittergit
 *
 * @class      Client
 * @param      {}    port    { description }
 * @param      {}    host    { description }
 */
var Client = function ( port, host )
{
  EventEmitter.call ( this ) ;
  this.socket                       = null ;
  this.user                         = null ;
  this.pendingEventList             = [] ;
  this.pendingResultList            = {} ;
  this.callbacks                    = {} ;
  this.pendingEventListenerList     = [] ;
  this.eventNameToListener          = new MultiHash() ;
  this.listenerFunctionsList        = [] ;
  this._pendingLockList             = [] ;
  this._acquiredResources           = {} ;
  this._ownedResources              = {} ;
  this.alive                        = false ;
  this.stopImediately               = false ;
  this._acquiredSemaphores          = {} ;
  this._ownedSemaphores             = {} ;
  this._pendingAcquireSemaphoreList = [] ;
  this.nameToActionCallback         = new MultiHash() ;

  var i = 0 ;
  var localhost = false ;
  if ( ! port && ! host )
  {
    port = T.getProperty ( "gepard.zeroconf.type" ) ;
  }
  if ( typeof port === 'string' && isNaN ( parseInt ( port ) ) )
  {
    port = { type: port } ;
  }
  if ( typeof port === 'object' && typeof host !== 'function' )
  {
    if ( port.type.startsWith ( "localhost:" ) )
    {
      localhost = true ;
      port.type = port.type.substring ( "localhost:".length ) ;
    }
    host = function auto_client_findService ( srv )
    {
      if ( localhost && ! srv.isLocalHost() )
      {
        return ;
      }
      return true ;
    } ;
  }
  if ( typeof port === 'object' && typeof host === 'function' )
  {
    this.zeroconf_based_pending_list = [] ;
    this.zeroconf_based_pendingEventList = [] ;
    this.userServiceLookupCallback  = host ;
    this.userServiceLookupParameter = port ;
    var thiz                        = this ;
    Log.logln ( "Service lookup with: " + util.inspect ( this.userServiceLookupParameter, { showHidden: false, depth: null } ) ) ;
    T.findService ( this.userServiceLookupParameter, function client_findService ( srv )
    {
      try
      {
        var service = new Service ( srv ) ;
        var o ;
        thiz._initialize ( srv.port, srv.host ) ;
        var rc = thiz.userServiceLookupCallback ( service ) ;
        if ( ! rc )
        {
          return ; 
        }
        if ( rc === true )
        {
          Log.logln ( "Service connect with: " + service.host + "/" + service.port ) ;
          var list = thiz.zeroconf_based_pending_list ;
          delete thiz["zeroconf_based_pending_list"] ;
          for ( i = 0 ; i < list.length ; i++ )
          {
            o = list[i] ;
            thiz.addEventListener ( o.eventNameList, o.callback ) ;
          }
          list.length = 0 ;
          list = thiz.zeroconf_based_pendingEventList ;
          delete thiz["zeroconf_based_pendingEventList"] ;
          for ( i = 0 ; i < list.length ; i++ )
          {
            o = list[i] ;
            thiz.emit ( o.params, o.callback, o.opts ) ;
          }
          list.length = 0 ;
          return true ;
        }
      }
      catch ( exc )
      {
        console.log ( exc ) ;
      }
    } ) ;
  }
  else
  {
    this._initialize ( port, host ) ;
  }
} ;
util.inherits ( Client, EventEmitter ) ;
Client.prototype._initialize = function ( port, host )
{
  this.port                         = port ;
  if ( ! this.port ) this.port      = T.getProperty ( "gepard.port", "17501" ) ;
  this.host                         = host ;
  if ( ! this.host ) this.host      = T.getProperty ( "gepard.host" ) ;
  this._application                 = process.argv[1] ;
  this._stats                       = new Stats() ;
  if ( this._application )
  {
    this._application = this._application.replace ( /\\/g, "/" ) ;
  }
  else
  {
    this._application = "Unknown" ;
  }
  this._networkAddresses = [] ;
  var networkInterfaces  = os.networkInterfaces() ;
  for ( var kk in networkInterfaces )
  {
    var ll = networkInterfaces[kk] ;
    for ( var ii = 0 ; ii < ll.length ; ii++ )
    {
      var oo = ll[ii] ;
      this._networkAddresses.push ( oo["address"] ) ;
    }
  }
  var ee = new Event() ;
  ee.addClassNameToConstructor ( "FileContainer", FileContainer ) ;
  this.USERNAME = T.getUSERNAME() ;
  if ( ! this.USERNAME )
  {
    this.USERNAME = "guest" ;
  }
  this.user                     = new User ( this.USERNAME ) ;
  this._timeStamp               = 0 ;
  this._heartbeatIntervalMillis = 10000 ;
  this._reconnectIntervalMillis = 5000 ;
  this._reconnect               = T.getBool ( "gepard.reconnect", this._reconnect ) ;
  this.version                  = 1 ;
  this.brokerVersion            = 0 ;
  TPStore.remoteTracer          = this.log.bind ( this ) ;
  this.channels = undefined;
  this.mainChannel = undefined ;
  this.setChannel ( T.getProperty ( "gepard.channel" ) ) ;
  this.sid                      = "" ;
  this._neverConnected          = true ;
};
Client.prototype.setChannel = function ( channel )
{
  if ( ! channel ) return ;
  if ( channel.indexOf ( ',' ) < 0 )
  {
    if ( channel.charAt ( 0 ) === '*' ) channel = channel.substring ( 1 ) ;
    this.mainChannel       = channel ;
    this.channels          = {} ;
    this.channels[channel] = true ;
    return ;
  }
  var l = channel.split ( ',' ) ;
  for ( var i = 0 ; i < l.length ; i++ )
  {
    l[i] = l[i].trim() ;
    if ( ! l[i] ) continue ;
    if ( i === 0 ) this.mainChannel = l[i] ;
    if ( l[i].charAt ( 0 ) === '*' )
    {
      l[i] = l[i].substring ( 1 ) ;
      if ( ! l[i] ) continue ;
      this.mainChannel = l[i] ;
    }
    if ( ! this.channels ) this.channels = {} ;
    this.channels[l[i]] = true ;
  }
};
Client.prototype.toString = function()
{
  return "(Client)[connected=" + ( this.socket ? true : false ) + "]" ;
};
Client.prototype.getChannel = function()
{
  return this.channels ;   
};
Client.prototype.getSid = function()
{
  return this.sid ;   
};
Client.prototype.registerTracePoint = function ( name )
{
  return TPStore.add ( name ) ;
};
Client.prototype.getTracePoint = function ( name )
{
  return TPStore.points[name] ;
};
Client.prototype.setReconnect = function ( state )
{
  state = !! state ;
  this._reconnect = state ;
  return this ;
};
Client.prototype.holdsLocksOrSemaphores = function()
{
  var k ;
  for ( k in this._acquiredResources )
  {
    return true ;
  }
  for ( k in this._ownedResources )
  {
    return true ;
  }
  for ( k in this._acquiredSemaphores )
  {
    return true ;
  }
  for ( k in this._ownedSemaphores )
  {
    return true ;
  }
  if ( this._pendingAcquireSemaphoreList.length )
  {
    return true ;
  }
  return false  ;
};
/**
 * Description
 * @method setUser
 * @param {} user
 * @return 
 */
// var index = this.socket.remoteAddress.indexOf ( this._networkAddresses[i]
//                                         ^
// TypeError: Cannot read property 'indexOf' of undefined

Client.prototype.setUser = function ( user )
{
  this.user = user ;
} ;
Client.prototype.brokerIsLocalHost = function()
{
  if ( typeof this._brokerIsLocalHost === 'boolean' )
  {
    return this._brokerIsLocalHost ;
  }
  if ( ! this.socket ) return false ;
  if ( ! this.socket.remoteAddress ) return false ;
  for ( i = 0 ; i < this._networkAddresses.length ; i++ )
  {
    var index = this.socket.remoteAddress.indexOf ( this._networkAddresses[i] ) ;
    if ( index < 0 )
    {
      continue ;
    }
    if ( this.socket.remoteAddress.indexOf ( this._networkAddresses[i] ) === this.socket.remoteAddress.length - this._networkAddresses[i].length )
    {
      this._brokerIsLocalHost = true ;
      return this._brokerIsLocalHost ;
    }
  }
  this._brokerIsLocalHost = false ;
  return this._brokerIsLocalHost ;
};
Client.prototype.createSocket = function()
{
  var b ;
  var gepard_private_key = T.getProperty ( "gepard.private.key" ) ;
  var gepard_public_cert = T.getProperty ( "gepard.public.cert" ) ; //TODO: from config.json
  if ( gepard_private_key && gepard_public_cert )
  {
console.log ( "gepard_private_key=" + Path.normalize(gepard_private_key) ) ;
console.log ( "gepard_public_cert=" + Path.normalize ( gepard_public_cert ) ) ;
    var options = {
       key  : fs.readFileSync ( Path.normalize ( gepard_private_key ) ),
       cert : fs.readFileSync ( Path.normalize ( gepard_public_cert ) ),
       ca: [ fs.readFileSync ( Path.normalize ( gepard_public_cert ) ) ]
    };
    if ( this.port  ) options.port = this.port ;
    if ( this.host  ) options.host = this.host ;
    var tls = require ( 'tls' ) ;
console.log ( options ) ;
    return tls.connect ( options ) ;
  }
  var p = {} ;
  if ( this.port  ) p.port = this.port ;
  if ( this.host  ) p.host = this.host ;
  var thiz = this ;
  return net.connect ( p ) ;
/*
var tls = require('tls');
var fs = require('fs');

var options = {
   key  : fs.readFileSync('private.key'),
   cert : fs.readFileSync('public.cert')
};

var client = tls.connect(8000, options, function () {
   console.log(client.authorized ? 'Authorized' : 'Not authorized');
});

client.on('data', function (data) {
   console.log(data.toString());
   client.end();
});
 */
};
/**
 * Description
 * @method connect
 * @return 
 */
Client.prototype.connect = function()
{
  var thiz = this ;
  this.socket = this.createSocket() ;

  this.socket.on ( 'end', function socket_on_end ( e )
  {
    thiz.alive = false ;
    if ( thiz.intervalId ) clearInterval ( thiz.intervalId ) ;
    thiz.socket = null ;
    thiz._private_emit ( "end", e ) ;
    if ( thiz._reconnect )
    {
      this.keepDataForReconnect = true ;
    }
    if ( this.keepDataForReconnect )
    {
      if ( thiz.userServiceLookupParameter && thiz.userServiceLookupCallback )
      {
        thiz._checkHeartbeat() ;
      }
      else
      {
        thiz.intervalId = setInterval ( thiz._checkHeartbeat.bind ( thiz ), thiz._reconnectIntervalMillis ) ;
      }
    }
  });
  this.socket.on ( 'error', function socket_on_error ( e )
  {
    thiz.alive = false ;
    thiz.socket = null ;
    thiz._private_emit ( "error", e ) ;
    if ( thiz.userServiceLookupParameter && thiz.userServiceLookupCallback )
    {
      thiz._checkHeartbeat() ;
    }
    else
    if ( thiz._reconnect )
    {
      if ( thiz.intervalId ) clearInterval ( thiz.intervalId ) ;
      if ( ! thiz.userServiceLookupParameter || ! thiz.userServiceLookupCallback )
      {
        thiz.intervalId = setInterval ( thiz._checkHeartbeat.bind ( thiz ), thiz._reconnectIntervalMillis ) ;
      }
    }
  });
  this.socket.on ( "connect", function()
  {
    var json ;
    thiz.brokerIsLocalHost() ;
    thiz.alive                      = true ;
    var client_info                 = new Event ( "system", "client_info" ) ;
    client_info.body.language       = "JavaScript" ;
    client_info.body.hostname       = os.hostname() ;
    client_info.body.connectionTime = new Date() ;
    client_info.body.application    = thiz._application ;
    client_info.body.USERNAME       = thiz.USERNAME ;
    client_info.body.version        = thiz.version ;
    client_info.body.channels       = thiz.channels ;
    client_info.setChannel ( thiz.mainChannel ) ;
    json                            = client_info.serialize() ;
    thiz._stats.incrementOut ( json.length ) ;
    this.write ( json ) ;
    var uid, ctx ;

    var i, j ;
    if ( thiz.pendingEventList.length )
    {
      for ( i = 0 ; i < thiz.pendingEventList.length ; i++ )
      {
        counter++ ;
        uid = os.hostname() + "_" + thiz.socket.localPort + "_" + new Date().getTime() + "_" + counter ;
        ctx = thiz.pendingEventList[i] ;
        var e = ctx.e ;
        var resultCallback = ctx.resultCallback ;
        e.setUniqueId ( uid ) ;
        if ( ctx.hasCallbacks )
        {
          thiz.callbacks[uid] = ctx ;
        }
        ctx.e = undefined ;
        e.setTargetIsLocalHost ( thiz.brokerIsLocalHost() ) ;
        e.setChannel ( thiz.mainChannel ) ;
        json = e.serialize() ;
        thiz._stats.incrementOut ( json.length ) ;
        this.write ( json, function()
        {
          if ( ctx.write ) ctx.write.apply ( thiz, arguments ) ;
        }) ;
      }
      thiz.pendingEventList.length = 0 ;
    }
    if ( thiz.pendingEventListenerList.length )
    {
      for ( i = 0 ; i < thiz.pendingEventListenerList.length ; i++ )
      {
        counter++ ;
        uid = os.hostname() + "_" + this.localPort + "_" + new Date().getTime() + "_" + counter ;
        ctx = thiz.pendingEventListenerList[i] ;
        ctx.e.setUniqueId ( uid ) ;
        thiz.send ( ctx.e ) ;
      }
      thiz.pendingEventListenerList.length = 0 ;
    }
    if ( thiz._pendingLockList.length )
    {
      for ( i = 0 ; i < thiz._pendingLockList.length ; i++ )
      {
        counter++ ;
        uid = os.hostname() + "_" + this.localPort + "_" + new Date().getTime() + "_" + counter ;
        ctx = thiz._pendingLockList[i] ;
        ctx.e.setUniqueId ( uid ) ;
        thiz.send ( ctx.e ) ;
        thiz._acquiredResources[ctx.e.body.resourceId] = ctx;
      }
      thiz._pendingLockList.length = 0 ;
    }
    if ( thiz._pendingAcquireSemaphoreList.length )
    {
      for ( i = 0 ; i < thiz._pendingAcquireSemaphoreList.length ; i++ )
      {
        counter++ ;
        uid = os.hostname() + "_" + this.localPort + "_" + new Date().getTime() + "_" + counter ;
        ctx = thiz._pendingAcquireSemaphoreList[i] ;
        ctx.e.setUniqueId ( uid ) ;
        thiz.send ( ctx.e ) ;
        thiz._acquiredSemaphores[ctx.e.body.resourceId] = ctx;
      }
      thiz._pendingAcquireSemaphoreList.length = 0 ;
    }
    thiz._neverConnected = false ;
    thiz._private_emit ( "connect" ) ;
  } ) ;
  this.socket.on ( 'data', function socket_on_data ( data )
  {
    if ( !thiz.alive )
    {
      return ;
    }
    thiz._timeStamp = new Date().getTime() ;
    var found ;
    var mm = data.toString() ;
    if ( ! this.partialMessage ) this.partialMessage = "" ;
    mm = this.partialMessage + mm ;
    this.partialMessage = "" ;
    var result ;
    try
    {
      result = T.splitJSONObjects ( mm, 0, false ) ;
    }
    catch ( exc )
    {
      Log.log ( exc ) ;
    }
    this.partialMessage = "" ;
    var messageList = result.list ;
    var i, j, k, kk ;
    var ctx, uid, rcb, e, callbackList ;
    if ( result.lastLineIsPartial )
    {
      this.partialMessage = messageList[messageList.length-1] ;
      messageList[messageList.length-1] = "" ;
    }
    for ( j = 0 ; j < messageList.length ; j++ )
    {
      if ( this.stopImediately )
      {
        return ;
      }
      var m = messageList[j] ;
      if ( !m || m.length === 0 )
      {
        continue ;
      }
      thiz._stats.incrementIn ( m.length ) ;
      if ( m.charAt ( 0 ) === '{' )
      {
        e = Event.prototype.deserialize ( m ) ;
        TPStore.log ( "EVENT_IN", e ) ;
        // e._Client = thiz ;
        if ( e.isResult() )
        {
          uid = e.getUniqueId() ;
          ctx = thiz.callbacks[uid] ;
          if ( ! e.isBroadcast() )
          {
            delete thiz.callbacks[uid] ;
          }
          if ( ! ctx )
          {
            console.log ( "callback not found for uid=" + uid ) ;
            console.log ( e ) ;
            continue ;
          }
          if ( ctx.result )
          {
            ctx.result.call ( thiz, e ) ;
          }
          continue ;
        }
        if ( e.isStatusInfo() )
        {
          uid = e.getUniqueId() ;
          ctx = thiz.callbacks[uid] ;
          if ( !ctx )
          {
            console.log ( e ) ;
            continue ;
          }
          if ( ctx.status )
          {
            delete thiz.callbacks[uid] ;
            ctx.status.call ( thiz, e ) ;
          }
          if ( ! thiz.alive )
          {
            break ;
          }
          continue ;
        }
        if ( e.getName() === "system" )
        {
          if ( e.getType() === "shutdown" )
          {
            thiz._private_emit ( "shutdown" ) ;
            if ( thiz._reconnect ) thiz._end ( true ) ;
            else                   thiz._end() ;
            return ;
          }
          if ( e.getType().indexOf ( "client/" ) === 0 )
          {
            thiz._handleSystemClientMessages ( e ) ;
            return ;
          }
          if ( e.getType() === "broker_info" )
          {
            thiz.brokerVersion = e.body.brokerVersion ;
            if ( thiz.brokerVersion > 0 )
            {
              thiz._heartbeatIntervalMillis = e.body._heartbeatIntervalMillis ;
              if ( thiz.intervalId )
              {
                clearInterval ( thiz.intervalId ) ;
              }
              if ( thiz._reconnect )
              {
                thiz.intervalId = setInterval ( thiz._checkHeartbeat.bind ( thiz ), thiz._heartbeatIntervalMillis ) ;
              }
            }
            thiz.sid = e.body.sid ;
            return ;
          }
          if ( e.getType() === "PING" )
          {
            e.setType ( "PONG" ) ;
            thiz.send ( e ) ;
            if ( e.body._heartbeatIntervalMillis && thiz._heartbeatIntervalMillis !== e.body._heartbeatIntervalMillis )
            {
              thiz._heartbeatIntervalMillis = e.body._heartbeatIntervalMillis ;
              if ( thiz.intervalId )
              {
                clearInterval ( thiz.intervalId ) ;
              }
              if ( thiz._reconnect )
              {
                thiz.intervalId = setInterval ( thiz._checkHeartbeat.bind ( thiz ), thiz._heartbeatIntervalMillis ) ;
              }
            }
            return ;
          }
          if ( e.isBad() )
          {
            uid = e.getUniqueId() ;
            ctx = thiz.callbacks[uid] ;
            if ( !ctx )
            {
              console.log ( e ) ;
              continue ;
            }
            delete thiz.callbacks[uid] ;
            rcb = ctx.error ;
            if ( e.isFailureInfoRequested() )
            {
              if ( ctx.failure )
              {
                rcb = ctx.failure ;
              }
            }
            if ( rcb )
            {
              rcb.call ( thiz, e ) ;
            }
            continue ;
          }
          ////////////////////////////
          // lock resource handling //
          ////////////////////////////
          if ( e.getType() === "lockResourceResult" )
          {
            ctx = thiz._acquiredResources[e.body.resourceId] ;
            delete thiz._acquiredResources[e.body.resourceId] ;
            if ( e.body.isLockOwner )
            {
              thiz._ownedResources[e.body.resourceId] = ctx ;
            }
            if ( ctx )
            {
              ctx.callback.call ( thiz, null, e ) ;
            }
            continue ;
          }
          if ( e.getType() === "unlockResourceResult" )
          {
            delete thiz._ownedResources[e.body.resourceId] ;
            continue ;
          }
          ////////////////////////
          // semaphore handling //
          ////////////////////////
          if ( e.getType() === "acquireSemaphoreResult" )
          {
            if ( e.body.isSemaphoreOwner )
            {
              thiz._ownedSemaphores[e.body.resourceId] = thiz._acquiredSemaphores[e.body.resourceId] ;
              delete thiz._acquiredSemaphores[e.body.resourceId] ;
              ctx = thiz._ownedSemaphores[e.body.resourceId] ;
              ctx.callback.call ( thiz, null, e ) ;
            }
            continue ;
          }
          if ( e.getType() === "releaseSemaphoreResult" )
          {
            continue ;
          }
        }
        else
        {
          if ( e.isBad() )
          {
            uid = e.getUniqueId() ;
            ctx = thiz.callbacks[uid] ;
            if ( ! ctx )
            {
              Log.warning ( e ) ;
              continue ;
            }
            delete thiz.callbacks[uid] ;
            rcb = ctx.error ;
            if ( e.isFailureInfoRequested() )
            {
              if ( ctx.failure )
              {
                rcb = ctx.failure ;
              }
            }
            if ( rcb )
            {
              rcb.call ( thiz, e ) ;
            }
            continue ;
          }
          found = false ;
          callbackList = thiz.eventNameToListener.get ( e.getName() ) ;
          if ( e.getChannel() )
          {
            var callbackList2 = thiz.eventNameToListener.get ( e.getChannel() + "::" + e.getName() ) ;
            if ( callbackList2 )
            {
              if ( callbackList )
              {
                callbackList = callbackList2.concat ( callbackList ) ;
              }
              else
              {
                callbackList = callbackList2.concat ( [] ) ;
              }
            }
          }

          if ( callbackList )
          {
            found = true ;
            for  ( k = 0 ; k < callbackList.length ; k++ )
            {
              if ( e.isResultRequested() )
              {
                e._Client = thiz ;
                callbackList[k].call ( thiz, e ) ;
                break ;
              }
              else
              {
                callbackList[k].call ( thiz, e ) ;
              }
            }
          }
          for ( k = 0 ; k < thiz.listenerFunctionsList.length ; k++ )
          {
            list = thiz.listenerFunctionsList[k]._regexpList ;
            if ( ! list ) continue ;
            for ( kk = 0 ; kk < list.length ; kk++ )
            {
              if ( ! list[kk].test ( e.getName() ) ) continue ;
              found = true ;
              if ( e.isResultRequested() )
              {
                e._Client = thiz ;
                thiz.listenerFunctionsList[k].call ( thiz, e ) ;
                break ;
              }
              else
              {
                thiz.listenerFunctionsList[k].call ( thiz, e ) ;
              }
            }
          }
          if ( ! found )
          {
            Log.logln ( "callbackList for " + e.getName() + " not found." ) ;
            Log.log ( e.toString() ) ;
            continue ;
          }
        }
      }
    }
  } ) ;
};

Client.prototype.isRunning = function ( callback )
{
  var thiz = this ;
  if ( this.userServiceLookupParameter && this.userServiceLookupCallback )
  {
    if ( this.intervalId ) clearInterval ( this.intervalId ) ;
    Log.logln ( "Service lookup for re-connect with: " + util.inspect ( this.userServiceLookupParameter, { showHidden: false, depth: null } ) ) ;

    T.findService ( this.userServiceLookupParameter, function client_findService ( srv )
    {
      try
      {
        thiz.port = srv.port ;
        thiz.host = srv.host ;
        var service = new Service ( srv ) ;
        service.setIsReconnect ( true ) ;
        var rc = thiz.userServiceLookupCallback ( service ) ;
        if ( ! rc )
        {
          return ;
        }
        if ( rc === true )
        {
          Log.logln ( "Service re-connect with: " + service.host + "/" + service.port ) ;
          callback.call ( thiz, true ) ;
          return true ;
        }
      }
      catch ( exc )
      {
        console.log ( exc ) ;
      }
    } ) ;
    return ;
  }
  var socket ;
  try
  {
    socket = this.createSocket ( p ) ;
    socket.on ( 'error', function socket_on_error( data )
    {
      socket.removeAllListeners() ;
      callback.call ( thiz, false ) ;
      socket.end() ;
    });
    socket.on ( "connect", function socket_on_connect()
    {
      socket.removeAllListeners() ;
      callback.call ( thiz, true ) ;
      socket.end() ;
    });
    socket.on ( "end", function socket_on_end()
    {
      socket.removeAllListeners() ;
      socket.unref() ;
    });
  }
  catch ( exc )
  {
  }
};
Client.prototype._checkHeartbeat = function()
{
  var i ;
  var thiz = this ;
  if ( ! this.alive )
  {
    if ( ! this._reconnect )
    {
      if  ( this.intervalId ) clearInterval ( this.intervalId ) ;
      return ;
    }
    this.isRunning ( function test_isRunning ( isRunning )
    {
      if ( ! isRunning )
      {
        return ;
      }
      if ( thiz.socket )
      {
        return ;
      }
      var keyList = this.eventNameToListener.getKeys() ;
      if ( keyList.length )
      {
        var e = new Event ( "system", "addEventListener" ) ;
        if ( thiz.user )
        {
          e.setUser ( thiz.user ) ;
        }
        e.body.eventNameList = keyList ;
        thiz.pendingEventListenerList.push ( { e:e } ) ;
        thiz.getSocket() ;
        Log.logln ( "re-connect in progress." ) ;
        Log.logln ( e.body.eventNameList ) ;
        thiz._private_emit ( "reconnect", e ) ;
      }
      if  ( thiz.intervalId ) clearInterval ( thiz.intervalId ) ;
      thiz.intervalId = setInterval ( thiz._checkHeartbeat.bind ( thiz ), thiz._heartbeatIntervalMillis ) ;
    }) ;
    return ;
  }
  var now = new Date().getTime() ;
  var heartbeatInterval = ( this._heartbeatIntervalMillis / 1000 ) ;
  var heartbeatInterval_x_3 = ( this._heartbeatIntervalMillis / 1000 ) * 3 ;
  var dt = ( now - this._timeStamp ) / 1000 ;
  if ( dt > heartbeatInterval_x_3 )
  {
    Log.logln ( "missing ping request -> end()" ) ;
    if ( ! this._reconnect )
    {
      this._end() ;
      if ( this.intervalId ) clearInterval ( this.intervalId ) ;
    }
    else
    {
      if  ( this.intervalId ) clearInterval ( this.intervalId ) ;
      this.intervalId = setInterval ( this._checkHeartbeat.bind ( this ), this._reconnectIntervalMillis ) ;
      this._private_emit ( "disconnect" ) ;
      this._end ( true ) ;
    }
  }
} ;
Client.prototype._writeCallback = function()
{
} ;
Client.prototype._private_emit = function ( eventName )
{
  return EventEmitter.prototype.emit.apply ( this, arguments ) ;
} ;
/**
 * Description
 * @method getSocket
 * @return MemberExpression
 */
Client.prototype.getSocket = function()
{
  if ( ! this.socket )
  {
    this.connect() ;
  }
  return this.socket ;
};
/**
 * Description
 * @method request
 * @param {} params
 * @param {} callback
 * @return 
 */
Client.prototype.request = function ( params, callback )
{
  if ( typeof callback === 'function' )
  {
    callback = { result: callback } ;
  }
  if ( typeof callback.result !== 'function' )
  {
    throw new Error ( "Missing result function.") ;
  }
  this.emit ( params, callback, { isBroadcast:false } ) ;
};
/**
 * Description
 * @method broadcast
 * @param {} params
 * @param {} callback
 * @return 
 */
Client.prototype.broadcast = function ( params, callback )
{
  if ( typeof callback === 'function' )
  {
    callback = { result: callback } ;
  }
  if ( typeof callback.result !== 'function' )
  {
    throw new Error ( "Missing result function.") ;
  }
  this.emit ( params, callback, { isBroadcast:true } ) ;
};
Client.prototype.systemInfo = function ( callback, parameter )
{
  if ( ! parameter ) parameter = {} ;
  if ( ! parameter.name ) parameter.name = "client/info/" ;
  if ( typeof callback === 'function' )
  {
    callback = { result: callback } ;
  }
  if ( typeof callback.result !== 'function' )
  {
    throw new Error ( "Missing result function.") ;
  }
  var e = new Event ( "system", parameter.name ) ;
  if ( parameter.sid )
  {
    e.putValue ( "sid", parameter.sid ) ;
  }
  e.putValue ( "parameter", parameter ) ;
  if ( parameter.channel )
  {
    e.setChannel ( parameter.channel ) ;
  }
  this.emit ( e, callback, { isBroadcast:true, internal: true } ) ;
};
Client.prototype.log = function ( messageText, callback )
{
  try
  {
    var e            = new Event ( "system", "log" ) ;
    var message      = { text: T.toString ( messageText ) } ;
    message.severity = "INFO" ;
    message.date     = new Date().toRFC3339String() ;
    e.putValue ( "message", message ) ;
    this.emit ( e, callback, { internal: true } ) ;
  }
  catch ( exc )
  {
    Log.log ( exc ) ;
    Log.logln ( messageText ) ;
    try
    {
      callback.call ( this, messageText ) ;
    }
    catch ( exc2 )
    {
      console.log ( exc2 ) ;
    }
  }
};
/**
 * Description
 * @method fire
 * @param {} params
 * @param {} callback
 * @return 
 */
Client.prototype.fire = function ( params, callback )
{
  return this.emit ( params, callback, null ) ;
};
/**
 * Description
 * @method fireEvent
 * @param {} params
 * @param {} callback
 * @return 
 */
Client.prototype.fireEvent = function ( params, callback )
{
  return this.emit ( params, callback, null ) ;
};
Client.prototype.emit = function ( params, callback, opts )
{
  if ( this.zeroconf_based_pendingEventList )
  {
    this.zeroconf_based_pendingEventList.push ( { params:params, callback:callback, opts:opts } ) ;
    return ;
  }
  if ( ! opts ) opts = {} ;
  var e = null, user, pos, name, channel ;
  if ( params instanceof Event )
  {
    e = params ;
    if ( e.isInUse() )
    {
      throw new Error ( "This event is used already. It must not be used again." ) ;
    }
  }
  else
  if ( typeof params === 'string' )
  {
    e = new Event ( params ) ;
  }
  else
  if ( params && typeof params === 'object' )
  {
    e = new Event ( params.name, params.type ) ;
    e.setBody ( params.body ) ;
    e.setUser ( params.user ) ;
  }
  if ( ! e.getUser() ) e.setUser ( this.user ) ;
  if ( e.getName() === "system" && ! opts.internal )
  {
    throw new Error ( "Client.emit: eventName must not be 'system'" ) ;
  }

  name = e.getName() ;
  pos = name.indexOf ( "::" ) ;
  if ( pos > 0 )
  {
    channel = name.substring ( 0, pos ) ;
    name    = name.substring ( pos + 2 ) ;
    e.setName ( name ) ;
    e.setChannel ( channel ) ;
  }
  var ctx = {} ;
  if ( callback )
  {
    if ( typeof callback === 'object' )
    {
      ctx.result = callback.result ;
      if ( e.control.__ignore_result_function_as_result_indicator__ === true  )
      {
      }
      else
      {
        if ( ctx.result ) e.setResultRequested() ;
      }
      delete e.control["__ignore_result_function_as_result_indicator__" ] ;
      ctx.failure = callback.failure ;
      if ( ctx.failure ) e.setFailureInfoRequested() ;
      ctx.status = callback.status ;
      if ( ctx.status ) e.setStatusInfoRequested() ;
      ctx.error = callback.error ;
      ctx.write = callback.write ;
      if ( opts.isBroadcast )
      {
        e.setIsBroadcast() ;
      }
    }
    else
    if ( typeof callback === 'function' )
    {
      if ( opts.isBroadcast )
      {
        ctx.result = callback ;
        e.setIsBroadcast() ;
      }
      else
      if ( e.isStatusInfoRequested() )
      {
        ctx.status = callback ;
      }
      else
      if ( e.isFailureInfoRequested() )
      {
        ctx.failure = callback ;
      }
      else
      {
        ctx.write = callback ;
      }
    }
  }
  else
  {
    if ( e.isFailureInfoRequested() )
    {
      throw new Error ( "Missing callback for FailureInfo" ) ;
    }
    if ( e.isStatusInfoRequested() )
    {
      throw new Error ( "Missing callback for StatusInfo" ) ;
    }
  }
  e.setInUse() ;

  if (  ctx.result
     || ctx.failure
     || ctx.status
     || ctx.error
     )
  {
    ctx.hasCallbacks = true ;
  }

  var socketExists = !! this.socket ;
  if ( this.pendingEventList.length || ! socketExists )
  {
    ctx.e = e ;
    this.pendingEventList.push ( ctx ) ;
  }
  var s = this.getSocket() ;
  if ( ! this.pendingEventList.length )
  {
    counter++ ;
    var uid = os.hostname() + "_" + this.socket.localPort + "_" + new Date().getTime() + "_" + counter ;
    e.setUniqueId ( uid ) ;
    if ( ctx.hasCallbacks )
    {
      this.callbacks[uid] = ctx ;
    }

    var thiz = this ;
    e.setTargetIsLocalHost ( thiz.brokerIsLocalHost() ) ;
    if ( ! e.getUser() )
    {
      e.setUser ( this.user ) ;
    }
    e.setChannel ( this.mainChannel ) ;
    var json = e.serialize() ;
    this._stats.incrementOut ( json.length ) ;
    s.write ( json, function()
    {
      thiz._timeStamp = new Date().getTime() ;
      if ( ctx.write ) ctx.write.apply ( thiz, arguments ) ;
    } ) ;
  }
  return this ;
};
/**
 * Description
 * @method end
 * @return 
 */

Client.prototype.end = function()
{
  this.setReconnect ( false ) ;
  this._end() ;
};
Client.prototype._end = function ( keepDataForReconnect )
{
  this.alive = false ;
  if ( this.socket )
  {
    this.socket.keepDataForReconnect = keepDataForReconnect ;
    this.socket.end() ;
  }
  this.socket = null ;
  this.pendingEventList = [] ;
  this.pendingResultList = {} ;
  this.pendingEventListenerList = [] ;
  if ( keepDataForReconnect !== true )
  {
    this.user = null ;
    this.eventNameToListener.flush() ;
    this.listenerFunctionsList = [] ;
    if ( this.intervalId ) clearInterval ( this.intervalId ) ;
    this.intervalId = null ;
  }
};
/**
 * Description
 * @method stop
 * @return 
 */
Client.prototype.stop = function()
{
  this.alive = false ;
  this.stopImediately = true ;
  this._end() ;
};
/**
 * Description
 * @method addEventListener
 * @param {} eventNameList
 * @param {} callback
 * @return 
 */
Client.prototype.addEventListener = function ( eventNameList, callback )
{
  if ( ! eventNameList ) throw new Error ( "Client.addEventListener: Missing eventNameList." ) ;
  if ( typeof callback !== 'function' ) throw new Error ( "Client.addEventListener: callback must be a function." ) ;
  if ( typeof eventNameList === 'string' ) eventNameList = [ eventNameList ] ;
  if ( ! Array.isArray ( eventNameList ) )
  {
    throw new Error ( "Client.addEventListener: eventNameList must be a string or an array of strings." ) ;
  }
  if ( ! eventNameList.length )
  {
    throw new Error ( "Client.addEventListener: eventNameList must not be empty." ) ;
  }
  if ( this.zeroconf_based_pending_list )
  {
    this.zeroconf_based_pending_list.push ( { eventNameList: eventNameList, callback: callback } ) ;
    return ;
  }
  var e = new Event ( "system", "addEventListener" ) ;
  if ( this.user )
  {
    e.setUser ( this.user ) ;
  }
  e.body.eventNameList = eventNameList ;
  var i, eventName, regexp ;
  for ( i = 0 ; i < eventNameList.length ; i++ )
  {
    eventName = eventNameList[i] ;
    if ( eventName === "system" )
    {
      throw new Error ( "Client.addEventListener: eventName must not be 'system'" ) ;
    }
    this.eventNameToListener.put ( eventName, callback ) ;
    regexp = null ;
    if ( eventName.charAt ( 0 ) === '/' && eventName.charAt ( eventName.length - 1 ) === '/' )
    {
      regexp = new RegExp ( eventName.substring ( 1, eventName.length - 1 ) ) ;
    }
    else
    if ( eventName.indexOf ( '.*' ) >= 0 )
    {
      regexp = new RegExp ( eventName ) ;
    }
    else
    if ( eventName.indexOf ( '*' ) >= 0 || eventName.indexOf ( '?' ) >= 0 )
    {
      regexp = new RegExp ( eventName.replace ( /\./, "\\." ).replace ( /\*/, ".*" ).replace ( '?', '.' ) ) ;
    }
    if ( regexp )
    {
      if ( ! callback._regexpList )
      {
        callback._regexpList = [] ;
      }
      callback._regexpList.push ( regexp ) ;
      this.listenerFunctionsList.push ( callback ) ;
    }
  }
  if ( ! this.socket )
  {
    this.pendingEventListenerList.push ( { e:e } ) ;
  }
  else
  if ( this.pendingEventListenerList.length )
  {
    this.pendingEventListenerList.push ( { e:e } ) ;
  }
  var s = this.getSocket() ;
  if ( ! this.pendingEventListenerList.length )
  {
    counter++ ;
    var uid = os.hostname() + "_" + this.localPort + "_" + new Date().getTime() + "_" + counter ;
    e.setUniqueId ( uid ) ;
    var thiz = this ;
    this.send ( e ) ;
  }
  return this ;
};
/**
 * Description
 * @method on
 * @param {} eventName
 * @param {} callback
 * @return 
 */
Client.prototype.on = function ( eventName, callback )
{
  if ( typeof eventName === "string" )
  {
    if (  eventName === "shutdown"
       || eventName === "end"
       || eventName === "error"
       || eventName === "reconnect"
       || eventName === "disconnect"
       )
    {
      EventEmitter.prototype.on.apply ( this, arguments ) ;
      return this ;
    }
  }
  this.addEventListener ( eventName, callback ) ;
  return this ;
};
Client.prototype.onAction = function ( cmd, desc, callback )
{
  if ( typeof desc === 'function' )
  {
    callback = desc ;
    desc = null ;
  }
  if ( !desc )
  {
    desc = cmd ;
  }
  this.nameToActionCallback.put ( cmd, { cmd:cmd, desc:desc, callback:callback } ) ;
};
/**
 * Description
 * @method remove
 * @param {} eventNameOrFunction
 * @return 
 */
Client.prototype.remove = function ( eventNameOrFunction )
{
  this.removeEventListener ( eventNameOrFunction ) ;
};
/**
 * Description
 * @method removeEventListener
 * @param {} eventNameOrFunction
 * @return 
 */
Client.prototype.removeEventListener = function ( eventNameOrFunction )
{
  if ( ! this.alive )
  {
    return ;
  }
  var i, j ;
  if ( typeof eventNameOrFunction === 'string' )
  {
    eventNameOrFunction = [ eventNameOrFunction ] ;
  }
  else
  if ( typeof eventNameOrFunction === 'function' )
  {
    eventNameOrFunction = [ eventNameOrFunction ] ;
  }
  else
  if ( Array.isArray ( eventNameOrFunction ) )
  {
  }
  else
  {
    throw new Error ( "Client.removeEventListener: eventNameOrFunction must be a function, a string or an array of strings." ) ;
  }

  var eventNameList = [] ;
  for ( i = 0 ; i < eventNameOrFunction.length  ; i++ )
  {
    var item = eventNameOrFunction[i] ;
    if ( typeof item === 'string' )
    {
      eventNameList.push ( item ) ;
      var list = this.eventNameToListener.get ( item ) ;
      if ( list )
      {
        for ( j = 0 ; j < list.length ; j++ )
        {
          this.listenerFunctionsList.remove ( list[j] ) ;
        }
      }
      this.eventNameToListener.remove ( item ) ;
    }
    else
    if ( typeof item === 'function' )
    {
      var keys = this.eventNameToListener.getKeysOf ( item ) ;
      for ( i = 0 ; i < keys.length ; i++ )
      {
        eventNameList.push ( keys[i] ) ;
      }
      this.eventNameToListener.remove ( item ) ;
      this.listenerFunctionsList.remove ( item ) ;
    }
    if ( ! eventNameList.length ) return ;
    var e = new Event ( "system", "removeEventListener" ) ;
    e.setUser ( this.user ) ;
    e.body.eventNameList = eventNameList ;
    this.send ( e ) ;
  }
};
/**
 * Description
 * @method lockResource
 * @param {} resourceId
 * @param {} callback
 * @return 
 */
Client.prototype.lockResource = function ( resourceId, callback )
{
  if ( typeof resourceId !== 'string' || ! resourceId )
  {
    Log.logln ( "Client.lockResource: resourceId must be a string." ) ;
    return ;
  }
  if ( typeof callback !== 'function' )
  {
    Log.logln ( "Client.lockResource: callback must be a function." ) ;
    return ;
  }
  if ( this._ownedResources[resourceId] || this._acquiredResources[resourceId] )
  {
    Log.logln ( "Client.lockResource: already owner of resourceId=" + resourceId ) ;
    return ;
  }

  var e = new Event ( "system", "lockResourceRequest" ) ;
  e.body.resourceId = resourceId ;
  var ctx = {} ;
  ctx.resourceId = resourceId ;
  ctx.callback = callback ;
  ctx.e = e ;

  if ( ! this.socket )
  {
    this._pendingLockList.push ( ctx ) ;
  }
  else
  if ( this._pendingLockList.length )
  {
    this._pendingLockList.push ( ctx ) ;
  }

  var s = this.getSocket() ;
  if ( ! this._pendingLockList.length )
  {
    counter++ ;
    var uid = os.hostname() + "_" + this.socket.localPort + "_" + new Date().getTime() + "_" + counter ;
    e.setUniqueId ( uid ) ;
    this._acquiredResources[resourceId] = ctx;
    this.send ( e ) ;
  }
};
/**
 * Description
 * @method unlockResource
 * @param {} resourceId
 */
Client.prototype.unlockResource = function ( resourceId )
{
  if ( typeof resourceId !== 'string' || ! resourceId )
  {
    Log.logln ( "Client.unlockResource: resourceId must be a string." ) ;
    return ;
  }
  delete this._acquiredResources[resourceId] ;
  if ( ! this._ownedResources[resourceId] )
  {
    Log.logln ( "Client.unlockResource: not owner of resourceId=" + resourceId ) ;
    return ;
  }

  var e = new Event ( "system", "unlockResourceRequest" ) ;
  e.body.resourceId = resourceId ;
  var s = this.getSocket() ;
  counter++ ;
  var uid = os.hostname() + "_" + this.socket.localPort + "_" + new Date().getTime() + "_" + counter ;
  e.setUniqueId ( uid ) ;
  delete this._ownedResources[resourceId] ;
  this.send ( e ) ;
};

/**
 * Description
 * @method acquireSemaphore
 * @param {} resourceId
 * @param {} callback
 * @return 
 */
Client.prototype.acquireSemaphore = function ( resourceId, callback )
{
  if ( typeof resourceId !== 'string' || ! resourceId )
  {
    Log.logln ( "Client.acquireSemaphore: resourceId must be a string." ) ;
    return ;
  }
  if ( typeof callback !== 'function' )
  {
    Log.logln ( "Client.acquireSemaphore: callback must be a function." ) ;
    return ;
  }
  if ( this._ownedSemaphores[resourceId] )
  {
    Log.logln ( "Client.acquireSemaphore: already owner of resourceId=" + resourceId ) ;
    return ;
  }

  var e = new Event ( "system", "acquireSemaphoreRequest" ) ;
  e.body.resourceId = resourceId ;
  var ctx = {} ;
  ctx.resourceId = resourceId ;
  ctx.callback = callback ;
  ctx.e = e ;
  if ( ! this.socket )
  {
    this._pendingAcquireSemaphoreList.push ( ctx ) ;
  }
  else
  if ( this._pendingAcquireSemaphoreList.length )
  {
    this._pendingAcquireSemaphoreList.push ( ctx ) ;
  }

  var s = this.getSocket() ;
  if ( ! this._pendingAcquireSemaphoreList.length )
  {
    counter++ ;
    var uid = os.hostname() + "_" + this.socket.localPort + "_" + new Date().getTime() + "_" + counter ;
    e.setUniqueId ( uid ) ;
    this._acquiredSemaphores[resourceId] = ctx;
    this.send ( e ) ;
  }
};

/**
 * Description
 * @method releaseSemaphore
 * @param {} resourceId
 * @return 
 */
Client.prototype.releaseSemaphore = function ( resourceId )
{
  if ( typeof resourceId !== 'string' || ! resourceId )
  {
    Log.logln ( "Client.releaseSemaphore: resourceId must be a string." ) ;
    return ;
  }
  delete this._acquiredSemaphores[resourceId] ;
  // if ( ! this._ownedSemaphores[resourceId] )
  // {
  //   Log.logln ( "Client.releaseSemaphore: not owner of resourceId=" + resourceId ) ;
  //   return ;
  // }

  var e = new Event ( "system", "releaseSemaphoreRequest" ) ;
  e.body.resourceId = resourceId ;
  var s = this.getSocket() ;
  counter++ ;
  var uid = os.hostname() + "_" + this.socket.localPort + "_" + new Date().getTime() + "_" + counter ;
  e.setUniqueId ( uid ) ;
  delete this._ownedSemaphores[resourceId] ;
  this.send ( e ) ;
};
Client.prototype._releaseAllSemaphores = function()
{
  for ( var key in this._ownedSemaphores )
  {
    this.releaseSemaphore ( this._ownedSemaphores[key] ) ;
  }
  this.releaseSemaphore = {} ;
};
////////////////////////////////////////////////////////////////////////////////
/// Unification                                                               //
////////////////////////////////////////////////////////////////////////////////
/**
 * Description
 * @method sendResult
 * @param {} message
 * @return 
 */
Client.prototype.sendResult = function ( message )
{
  if ( ! message.isResultRequested() )
  {
    this.error ( "No result requested" ) ;
    this.error ( message ) ;
    return ;
  }
  message.setIsResult() ;
  this.send ( message ) ;
};
/**
 * Description
 * @param {} event
 */
Client.prototype.send = function ( e )
{
  e.setTargetIsLocalHost ( this.brokerIsLocalHost() ) ;
  e.setChannel ( this.mainChannel ) ;
  var json = e.serialize() ;
  this._stats.incrementOut ( json.length ) ;
  this.getSocket().write ( json ) ;
  TPStore.log ( "EVENT_OUT", e ) ;
  this._timeStamp = new Date().getTime() ;
};
/**
 * Description
 * @param {} what
 */
Client.prototype.error = function ( what )
{
  Log.error ( what ) ;
};
/**
 * Register a TracePoint for the application
 *
 * @method     registerTracePoint
 * @param      {string|TracePoint}  tp        name for new TracePoint or
 *                                            TracePoint object
 * @param      {boolean}            isActive  initial activation state
 * @return     {TracePoint}         given TracePoint or newly created
 *                                  TracePoint
 */
Client.prototype.registerTracePoint = function ( tp, isActive )
{
  return TPStore.add ( tp, isActive ) ;
};
/**
 * Remove a TracePoint
 *
 * @method     removeTracePoint
 * @param      {string}  name    name of TP
 */
Client.prototype.removeTracePoint = function ( name )
{
  TPStore.remove ( name ) ;
};
Client.prototype.getTracePoint = function ( name )
{
  return TPStore.points[name] ;
};
Client.prototype._handleSystemClientMessages = function ( e )
{
  try
  {
    var info = e.body.info = {} ;
    var i, j, ctx, list, ai, al, tracePointResult ;
    if ( e.getType().startsWith ( "client/action/" ) )
    {
      if ( e.body.parameter.actionName === "tp" )
      {
        tracePointResult = TPStore.action ( e.body.parameter ) ;
        if ( tracePointResult )
        {
          info.tracePointStatus = tracePointResult ;
        }
      }
      else
      if ( e.body.parameter.actionName === "info" )
      {
        var keys = this.nameToActionCallback.getKeys() ;
        if ( ! keys.length )
        {
          e.control.status = { code:1, name:"error", reason:"no actions available" } ;
          e.setIsResult() ;
          this.send ( e ) ;
          return ;
        }
        else
        {
          al = info.actionInfo = [] ;
          for ( i = 0 ; i < keys.length ; i++ )
          {
            list = this.nameToActionCallback.get ( keys[i] ) ;
            for ( j = 0 ; j < list.length ; j++ )
            {
              ctx = list[j] ;
              al.push ( { cmd:ctx.cmd, desc:ctx.desc } ) ;
            }
          }
        }
      }
      else
      if ( e.body.parameter.actionName === "execute" )
      {
        list = this.nameToActionCallback.get ( e.body.parameter.cmd ) ;
        if ( ! list )
        {
          e.control.status = { code:1, name:"error", reason:"no actions available for cmd=" + e.body.parameter.cmd } ;
          e.setIsResult() ;
          this.send ( e ) ;
          return ;
        }
        else
        {
          al = info.actionResult = [] ;
          for ( i = 0 ; i < list.length ; i++ )
          {
            ai = new ActionCmd ( e.body.parameter.cmd ) ;
            ai.parameter = e.body.parameter ;
            al.push ( ai ) ;
            list[i].callback.call ( this, this, ai ) ;
            delete ai["parameter"] ;
          }
        }
      }
      else
      {
        e.control.status = { code:1, name:"error", reason:"invalid: " + e.getType() } ;
        e.setIsResult() ;
        this.send ( e ) ;
        return ;
      }
      e.removeValue ( "parameter" ) ;
    }
    else
    if ( e.getType().startsWith ( "client/info/" ) )
    {
      if ( e.getType().contains ( "/info/where/" ) )
      {
        info.where = {} ;
      }
      else
      if ( e.getType().contains ( "/info/tp/" ) )
      {
        tracePointResult = TPStore.action ( e.body.tracePointActionList ) ;
        if ( tracePointResult )
        {
          info.tracePointStatus = tracePointResult ;
        }
      }
      else
      if ( e.getType().contains ( "/info/env/" ) )
      {
        info.env = process.env ;
      }
      else
      {
        info.process =
        {
          arch        : process.arch
        , cwd         : process.cwd()
        , memoryUsage : process.memoryUsage()
        , pid         : process.pid
        , platform    : process.platform
        , release     : process.release
        , uptime      : process.uptime()
        } ;
        info.os =
        {
          freemem   : os.freemem()
        , cpus      : os.cpus()
        , totalmem  : os.totalmem()
        , loadavg   : os.loadavg()
        , release   : os.release()
        , uptime    : os.uptime()
        } ;
      }
    }
    e.control.status = { code:0, name:"success", reason:"ack" } ;
    e.setIsResult() ;
    this.send ( e ) ;
  }
  catch ( exc )
  {
    Log.log ( exc ) ;
    e.control.status = { code:1, name:"error", reason:"reject" } ;
    e.setIsResult() ;
    this.send ( e ) ;
  }
};
module.exports = Client ;
