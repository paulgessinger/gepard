#!/usr/bin/env node

/**
 * [net description]
 * @type {[type]}
 */
var net          = require ( 'net' ) ;
var util         = require ( 'util' ) ;
var EventEmitter = require ( "events" ).EventEmitter ;
var Event        = require ( "./Event" ) ;
var T            = require ( "./Tango" ) ;
var MultiHash    = require ( "./MultiHash" ) ;
var Log          = require ( "./LogFile" ) ;
var os           = require ( "os" ) ;
var fs           = require ( "fs" ) ;
var dns          = require ( "dns" ) ;

/**
 * Description
 * @constructor Connection
 * @param {} broker
 * @param {} socket
 * @return 
 */
var Connection = function ( broker, socket )
{
  this.broker     = broker ;
  this.socket     = socket ;
  this.info       = "none" ;
  if ( ! this.socket.sid )
  {
    this.sid        = socket.remoteAddress + "_" + socket.remotePort ;
    this.socket.sid = this.sid ;
  }
  else
  {
    this.sid = socket.sid ;
  }
  this._lockedResourcesIdList                 = [] ;
  this._patternList                           = [] ;
  this._regexpList                            = [] ;
  this._ownedSemaphoresRecourceIdList         = [] ;
  this._pendingAcquireSemaphoreRecourceIdList = [] ;
  this._numberOfPendingRequests               = 0 ;
  this._messageUidsToBeProcessed = [] ;
};
/**
 * Description
 * @method toString
 * @return Literal
 */
Connection.prototype.toString = function()
{
  return "(Connection)[client_info=" + util.inspect ( this.client_info, { showHidden: false, depth: null } ) + "]" ;
};
/**
 * Description
 * @method removeEventListener
 * @param {} e
 * @return 
 */
Connection.prototype.removeEventListener = function ( e )
{
  var i, index ;
  var eventNameList = e.body.eventNameList ;
  if ( ! eventNameList || ! eventNameList.length )
  {
    eventNameList = this.eventNameList ;
  }
  if ( ! eventNameList || ! eventNameList.length )
  {
    e.control.status = { code:1, name:"error", reason:"Missing eventNameList" } ;
    Log.error ( e.toString() ) ;
    return ;
  }
  var toBeRemoved = [] ;
  for  ( i = 0 ; i < eventNameList.length ; i++ )
  {
    this.broker._eventNameToSockets.remove ( eventNameList[i], this.socket ) ;
    index  = this.eventNameList.indexOf ( eventNameList[i] ) ;
    if ( index >= 0 )
    {
      toBeRemoved.push ( eventNameList[i] ) ;
    }
    index = this._patternList.indexOf ( eventNameList[i] ) ;
    if ( index >= 0 )
    {
      this._patternList.remove ( index ) ;
      this._regexpList.remove ( index ) ;
    }
  }
  for  ( i = 0 ; i < toBeRemoved.length ; i++ )
  {
    this.eventNameList.remove ( toBeRemoved[i] ) ;
  }
  toBeRemoved.length = 0 ;
};
/**
 * Description
 * @method write
 * @param {} data
 * @return 
 */
Connection.prototype.write = function ( data )
{
  if ( data instanceof Event )
  {
    this.socket.write ( data.serialize() ) ;
  }
  if ( typeof data === 'string' )
  {
    this.socket.write ( data ) ;
  }
};
/**
 * Description
 * @method sendInfoResult
 * @param {} e
 * @return 
 */
Connection.prototype.sendInfoResult = function ( e )
{
  var i, first, str, key, conn, key2 ;
  e.setType ( "getInfoResult" ) ;
  e.control.status = { code:0, name:"ack" } ;
  e.body.log = { levelName: Log.getLevelName(), level:Log.getLevel() } ;
  e.body.currentEventNames = this.broker._eventNameToSockets.getKeys() ;
  for ( i = 0 ; i < this.broker._connectionList.length ; i++ )
  {
    list = this.broker._connectionList[i]._regexpList ;
    if ( list )
    {
      if ( ! e.body.currentEventPattern ) e.body.currentEventPattern = [] ;
      for ( j = 0 ; j < list.length ; j++ )
      {
        e.body.currentEventPattern.push ( list[j].toString() ) ;
      }
    }
  }     
  var mhclone = new MultiHash() ;
  for ( key in this.broker._eventNameToSockets._hash )
  {
    var afrom = this.broker._eventNameToSockets.get ( key ) ;
    if ( typeof ( afrom ) === 'function' ) continue ;
    for ( i = 0 ; i < afrom.length ; i++ )
    {
      mhclone.put ( key, afrom[i].sid ) ;
    }
  }
  e.body.mapping = mhclone._hash ;
  e.body.connectionList = [] ;
  for ( key in this.broker._connections )
  {
    conn = this.broker._connections[key] ;
    var client_info = conn.client_info ;
    if ( ! client_info ) continue ;
    var client_info2 = {} ;
    for ( key2 in client_info )
    {
      client_info2[key2] = client_info[key2] ;
    }
    e.body.connectionList.push ( client_info2 ) ;
    if ( conn._ownedSemaphoresRecourceIdList.length )
    {
      client_info2.ownedSemaphores = conn._ownedSemaphoresRecourceIdList ;
    }
    if ( conn._pendingAcquireSemaphoreRecourceIdList.length )
    {
      client_info2.pendingSemaphores = conn._pendingAcquireSemaphoreRecourceIdList ;
    }
  }
  for ( key in this.broker._lockOwner )
  {
    if ( ! e.body.lockList )
    {
      e.body.lockList = [] ;
    }
    e.body.lockList.push ( { resourceId: key, owner: this.broker._lockOwner[key].client_info } ) ;
  }
  for ( key in this.broker._semaphoreOwner )
  {
    if ( ! e.body.semaphoreList )
    {
      e.body.semaphoreList = [] ;
    }
    e.body.semaphoreList.push ( { resourceId: key, owner: this.broker._semaphoreOwner[key].client_info } ) ;
  }
  this.write ( e ) ;
};
/**
 * Description
 * @method addEventListener
 * @param {} e
 * @return 
 */
Connection.prototype.addEventListener = function ( e )
{
  var eventNameList = e.body.eventNameList ;
  if ( ! eventNameList || ! eventNameList.length )
  {
    e.control.status = { code:1, name:"error", reason:"Missing eventNameList" } ;
    Log.error ( e.toString() ) ;
    this.write ( e ) ;
    return ;
  }
  if ( ! this.eventNameList ) this.eventNameList = [] ;

  for  ( i = 0 ; i < eventNameList.length ; i++ )
  {
    str = eventNameList[i] ;
    if ( str.indexOf ( "*" ) < 0 )
    {
      this.eventNameList.push ( str ) ;
    }
    else
    {
      this._patternList.push ( str ) ;
      str = str.replace ( /\./g, "\\." ).replace ( /\*/g, ".*" ) ;
      regexp = new RegExp ( str ) ;
      this._regexpList.push ( regexp ) ;
    }
  }
  for  ( i = 0 ; i < eventNameList.length ; i++ )
  {
    str = eventNameList[i] ;
    if ( str.indexOf ( "*" ) < 0 )
    {
      this.broker._eventNameToSockets.put ( str, this.socket ) ;
    }
  }
  e.control.status = { code:0, name:"ack" } ;
  this.write ( e ) ;
};
Connection.prototype.setCurrentlyProcessedMessageUid = function ( uid )
{
  this._currentlyProcessedMessageUid = uid ;
};
Connection.prototype.getCurrentlyProcessedMessageUid = function()
{
  return this._currentlyProcessedMessageUid ;
};
Connection.prototype.getNextMessageUidToBeProcessed = function()
{
  return this._messageUidsToBeProcessed.shift() ;
};

/**
 * @constructor
 * @extends {EventEmitter}
 * @method Broker
 * @param {} port
 * @param {} ip
 * @return 
 */
var Broker = function ( port, ip )
{
  EventEmitter.call ( this ) ;
  this._connections                        = {} ;
  this._eventNameToSockets                 = new MultiHash() ;
  this._connectionList                     = [] ;
  this.port                                = port ;
  this.ip                                  = ip ;
  this.closing                             = false ;
  var thiz                                 = this ;
  var conn ;
  this._lockOwner                          = {} ;
  this._semaphoreOwner                     = {} ;
  this._pendingAcquireSemaphoreConnections = new MultiHash() ;
  
  this.hostname                            = os.hostname() ;
  this._networkAddresses                   = [] ;
  var networkInterfaces                    = os.networkInterfaces() ;
  this._messagesToBeProcessed              = {} ;
  this.server                              = net.createServer() ;
  for ( var kk in networkInterfaces )
  {
    var ll = networkInterfaces[kk]
    for ( var ii = 0 ; ii < ll.length ; ii++ )
    {
      var oo = ll[ii] ;
      this._networkAddresses.push ( oo["address"] ) ;
    }
  }
  this.server.on ( "error", function onerror ( p )
  {
    Log.error ( p ) ;
    thiz.emit ( "error" ) ;
  });
  this.server.on ( "close", function onclose ( p )
  {
    Log.info ( p ) ;
    thiz.emit ( "close" ) ;
  });
  this.server.on ( "connection", function server_on_connection ( socket )
  {
    var i = 0 ;
    if ( thiz.closing )
    {
      socket.end() ;
      return ;
    }
    conn = new Connection ( thiz, socket ) ;
    thiz._connections[conn.sid] = conn ;
    thiz._connectionList.push ( conn ) ;
    Log.info ( 'Socket connected' );
    socket.on ( "error", thiz._ejectSocket.bind ( thiz, socket ) ) ;
    socket.on ( 'close', thiz._ejectSocket.bind ( thiz, socket ) ) ;
    socket.on ( 'end', thiz._ejectSocket.bind ( thiz, socket ) ) ;
    socket.on ( "data", function socket_on_data ( chunk )
    {
      var mm = chunk.toString() ;
      if ( thiz.closing )
      {
        return ;
      }
      var i, j, found ;
      var eventNameList ;
      var eOut ;
      var str ;
      var key ;
      var sid ;
      var index ;
      var regexp ;
      var name ;
      var list ;
      var requesterConnection ;
      var responderConnection ;
      var uid ;
      var found_map ;
//       if ( thiz._whitelist_map )
//       {
// console.log ( "this.remoteAddress=" + this.remoteAddress ) ;
//         found_map = thiz._whitelist_map[this.remoteAddress]
// T.log  ( found_map ) ;
//         if ( !found_map && thiz.socketIsFrom_localhost )
//         {
//           found_map = thiz._whitelist_map["localhost"]
// T.log  ( found_map ) ;
//         }
//         if ( ! found_map )
//         {
//           for ( var i = 0 ; i < thiz._whitelist_patternList.length ; i++ )
//           {
//             if ( ! thiz._whitelist_patternList[i].regexp.test ( this.remoteAddress ) ) continue ;
// T.log ( thiz._whitelist_patternList[i].patternList ) ;
//           }
//         }
//       }
      if ( ! this.partialMessage ) this.partialMessage = "" ;
      mm = this.partialMessage + mm ;
      this.partialMessage = "" ;
      var result = T.splitJSONObjects ( mm ) ;
      var messageList = result.list ;
      var j = 0 ;
      for ( j = 0 ; j < messageList.length ; j++ )
      {
        var m = messageList[j] ;
        if ( m.length === 0 )
        {
          continue ;
        }
        if ( j === messageList.length - 1 )
        {
          if ( result.lastLineIsPartial )
          {
            this.partialMessage = m ;
            break ;
          }
        }
        if ( m.charAt ( 0 ) === '{' )
        {
          var e = null ;
          try
          {
            e = Event.prototype.deserialize ( m ) ;
          }
          catch ( exc )
          {
            Log.log ( exc ) ;
            Log.log ( m ) ;
            this.end() ;
            return ;
          }
          if ( ! e.body )
          {
            thiz._ejectSocket ( this ) ;
            continue ;
          }
          if ( e.isResult() )
          {
            responderConnection = thiz._connections[this.sid] ;
            responderConnection._numberOfPendingRequests-- ;
            sid                 = e.getSourceIdentifier() ;
            uid                 = e.getUniqueId() ;
            requesterConnection = thiz._connections[sid] ;

            for ( i = 0 ; i < thiz._connectionList.length  ; i++ )
            {
              thiz._connectionList[i]._messageUidsToBeProcessed.remove ( uid ) ;
            }
            delete thiz._messagesToBeProcessed[uid] ;
            responderConnection.setCurrentlyProcessedMessageUid ( "" ) ;
            if ( requesterConnection )
            {
              requesterConnection.write ( e ) ;
              uid = responderConnection.getNextMessageUidToBeProcessed() ;
              if ( uid )
              {
                e  = thiz._messagesToBeProcessed[uid] ;
                responderConnection.write ( e ) ;
                responderConnection._numberOfPendingRequests++ ;
                responderConnection.setCurrentlyProcessedMessageUid ( uid ) ;
              }
            }
            else
            {
              Log.log ( "Requester not found for result:\n" + e.toString() ) ;
            }
            continue ;
          }
          if ( e.getName() === 'system' )
          {
            thiz._handleSystemMessages ( this, e ) ;
            continue ;
          }
          thiz._sendEventToClients ( socket, e ) ;
        }
      }
    });
  });
};
util.inherits ( Broker, EventEmitter ) ;

Broker.prototype.socketIsFrom_localhost = function ( socket )
{
  for ( i = 0 ; i < this._networkAddresses.length ; i++ )
  {
    var index = socket.remoteAddress.indexOf ( this._networkAddresses[i] ) ;
    if ( index < 0 )
    {
      continue ;
    }
    if ( socket.remoteAddress.indexOf ( this._networkAddresses[i] ) === socket.remoteAddress.length - this._networkAddresses[i].length )
    {
      return true ;
    }
  }
  return false ;
};
/**
 * Description
 * @method toString
 * @return Literal
 */
Broker.prototype.toString = function()
{
  return "(Broker)[]" ;
};
/**
 * Description
 * @method _sendMessageToClient
 * @param {} socket
 * @param {} e
 * @return 
 */
Broker.prototype._sendMessageToClient = function ( e, socketList )
{
  var socket, i, messageSent       = false ;
  var uid                          = e.getUniqueId() ;
  this._messagesToBeProcessed[uid] = e ;
  var str                          = e.serialize() ;
  for ( i = 0 ; i < socketList.length ; i++ )
  {
    socket = socketList[i] ;
    conn   = this._connections[socket.sid] ;
    conn._messageUidsToBeProcessed.push ( uid ) ;
    if ( ! messageSent )
    {
      if ( conn._numberOfPendingRequests === 0 )
      {
        socket.write ( str ) ;
        conn._numberOfPendingRequests++ ;
        conn.setCurrentlyProcessedMessageUid ( uid ) ;
        messageSent = true ;
      }
    }
  }
};
/**
 * Description
 * @method _sendEventToClients
 * @param {} socket
 * @param {} e
 * @return 
 */
Broker.prototype._sendEventToClients = function ( socket, e )
{
  var i, found = false, done = false, str ;
  var name = e.getName() ;
  e.setSourceIdentifier ( socket.sid ) ;
  var str = e.serialize() ;
  var socketList = this._eventNameToSockets.get ( name ) ;
  var s, conn ;
  if ( socketList )
  {
    found = true ;
    if ( e.isResultRequested() && ! e.isBroadcast() )
    {
      this._sendMessageToClient ( e, socketList ) ;
    }
    else
    {
      for ( i = 0 ; i < socketList.length ; i++ )
      {
        socketList[i].write ( str ) ;
      }
    }
    return ;
  }
  for ( i = 0 ; i < this._connectionList.length ; i++ )
  {
    list = this._connectionList[i]._regexpList ;
    if ( ! list ) continue ;
    for ( j = 0 ; j < list.length ; j++ )
    {
      if ( ! list[j].test ( name ) ) continue ;
      found = true ;
      this._connectionList[i].socket.write ( str ) ;
      if ( e.isResultRequested() && ! e.isBroadcast() )
      {
        break ;
      }
    }
    if ( found && e.isResultRequested() && ! e.isBroadcast() )
    {
      break ;
    }
  }
  if ( ! found )
  {
    if ( e.isResultRequested() || e.isFailureInfoRequested() )
    {
      e.setIsResult() ;
      e.control.status = { code:1, name:"warning", reason:"No listener found for event: " + e.getName() } ;
      e.control.requestedName = e.getName() ;
      socket.write ( e.serialize() ) ;
      return ;
    }
    Log.info ( "No listener found for " + e.getName() ) ;
  }
};
/**
 * Description
 * @method _handleSystemMessages
 * @param {} socket
 * @param {} e
 * @return 
 */
Broker.prototype._handleSystemMessages = function ( socket, e )
{
  var conn, i, found ;
  if ( e.getType() === "addMultiplexer" )
  {
    return ;
  }
  else
  if ( e.getType() === "shutdown" )
  {
    if ( ! this.socketIsFrom_localhost ( socket ) )
    {
      socket.end() ;
      return ;
    }
    var shutdown_sid = e.body.shutdown_sid ;
    if ( shutdown_sid )
    {
      conn = this._connections[socket.sid] ;
      var target_conn = this._connections[shutdown_sid] ;
      found = false ;
      if ( target_conn )
      {
        found = true ;
        target_conn.write ( new Event ( "system", "shutdown" ) ) ;
        target_conn.socket.end() ;
      }
      else
      {
        for ( i = 0 ; i < this._connectionList.length ; i++ )
        {
          if ( ! this._connectionList[i].client_info ) continue ;
          if ( this._connectionList[i].client_info.applicationName === shutdown_sid )
          {
            found = true ;
            this._connectionList[i].write ( new Event ( "system", "shutdown" ) ) ;
            this._connectionList[i].socket.end() ;
          }
        }
      }
      if ( ! found )
      {
        e.control.status = { code:1, name:"error", reason:"no connection for sid=" + shutdown_sid } ;
        socket.write ( e.serialize() ) ;
        return ;
      }
      e.control.status = { code:0, name:"ack" } ;
      socket.write ( e.serialize() ) ;
      return ;
    }
    else
    {
      Log.notice ( 'server shutting down' ) ;
      e.control.status = { code:0, name:"ack" } ;
      socket.write ( e.serialize() ) ;
      this._closeAllSockets() ;
      this.server.unref() ;
      Log.notice ( 'server shut down' ) ;
      this.emit ( "shutdown" ) ;
    }
  }
  else
  if ( e.getType() === "client_info" )
  {
    conn = this._connections[socket.sid] ;
    conn.client_info = e.body ; e.body = {} ;
    conn.client_info.sid = socket.sid ;
    var app = conn.client_info.application ;
    if ( app )
    {
      app = app.replace ( /\\/g, "/" ) ;
      if ( app.indexOf ( '/' ) < 0 )
      {
        if ( app.lastIndexOf ( ".js" ) == app.length - 3 )
        {
          app = app.substring ( 0, app.length - 3 ) ;
        }
        conn.client_info.applicationName = app ;

      }
      else
      {
        if ( app.lastIndexOf ( ".js" ) == app.length - 3 )
        {
          app = app.substring ( 0, app.length - 3 ) ;
        }
        conn.client_info.applicationName = app.substring ( app.lastIndexOf ( '/' ) + 1 ) ;
      }
    }
  }
  else
  if ( e.getType() === "getInfoRequest" )
  {
    conn = new Connection ( this, socket )
    conn.sendInfoResult ( e ) ;
  }
  else
  if ( e.getType() === "addEventListener" )
  {
    conn = this._connections[socket.sid] ;
    conn.addEventListener ( e ) ;
  }
  else
  if ( e.getType() === "removeEventListener" )
  {
    conn = this._connections[socket.sid] ;
    conn.removeEventListener ( e ) ;
  }
  else
  if ( e.getType() === "lockResourceRequest" )
  {
    conn = this._connections[socket.sid] ;
    var resourceId = e.body.resourceId ;
    if ( ! resourceId )
    {
      this._ejectSocket ( socket ) ;
      return ;
    }
    e.setType ( "lockResourceResult" ) ;
    if ( this._lockOwner[resourceId] )
    {
      e.body.isLockOwner = false ;
    }
    else
    {
      this._lockOwner[resourceId] = conn ;
      conn._lockedResourcesIdList.push ( resourceId ) ;
      e.body.isLockOwner = true ;
    }
    conn.write ( e ) ;
  }
  else
  if ( e.getType() === "unlockResourceRequest" )
  {
    conn = this._connections[socket.sid] ;
    var resourceId = e.body.resourceId ;
    if ( ! resourceId )
    {
      this._ejectSocket ( socket ) ;
      return ;
    }
    e.setType ( "unlockResourceResult" ) ;
    e.body.isLockOwner = false ;
    if ( ! this._lockOwner[resourceId] )
    {
      e.control.status = { code:1, name:"error", reason:"not owner of resourceId=" + resourceId } ;
    }
    else
    {
      e.control.status = { code:0, name:"ack" } ;
    }
    delete this._lockOwner[resourceId] ;
    conn._lockedResourcesIdList.remove ( resourceId ) ;
    conn.write ( e ) ;
  }
  else
  if ( e.getType() === "acquireSemaphoreRequest" )
  {
    this._acquireSemaphoreRequest ( socket, e ) ;
  }
  else
  if ( e.getType() === "releaseSemaphoreRequest" )
  {
    this._releaseSemaphoreRequest ( socket, e ) ;
  }
  else
  {
    Log.error ( "Invalid type: '" + e.getType() + "' for " + e.getName() ) ;
    Log.error ( e.toString() ) ;
  }
};
Broker.prototype._acquireSemaphoreRequest = function ( socket, e )
{
  var conn = this._connections[socket.sid] ;
  var resourceId = e.body.resourceId ;
  if ( ! resourceId )
  {
    this._ejectSocket ( socket ) ;
    return ;
  }
  var currentSemaphoreOwner = this._semaphoreOwner[resourceId] ;
  if ( currentSemaphoreOwner )
  {
    if ( currentSemaphoreOwner === conn )
    {
      Log.error ( conn.toString() + "\n is already owner of semaphore=" + resourceId ) ;
      e.control.status = { code:1, name:"error", reason:"already owner of semaphore=" + resourceId } ;
      conn.write ( e ) ;
      return ;
    }
    e.body.isSemaphoreOwner = false ;
    this._pendingAcquireSemaphoreConnections.put ( resourceId, conn ) ;
    conn._pendingAcquireSemaphoreRecourceIdList.push ( resourceId ) ;
    return ;
  }
  this._setIsSemaphoreOwner ( conn, resourceId ) ;
};
Broker.prototype._setIsSemaphoreOwner = function ( conn, resourceId )
{
  this._semaphoreOwner[resourceId] = conn ;
  conn._ownedSemaphoresRecourceIdList.push ( resourceId ) ;
  conn._pendingAcquireSemaphoreRecourceIdList.remove ( resourceId ) ;
  this._pendingAcquireSemaphoreConnections.remove ( resourceId, conn ) ;
  var e                   = new Event ( "system", "acquireSemaphoreResult" ) ;
  e.body.resourceId       = resourceId ;
  e.body.isSemaphoreOwner = true ;
  conn.write ( e ) ;
};
Broker.prototype._releaseSemaphoreRequest = function ( socket, e )
{
  var conn = this._connections[socket.sid] ;
  var resourceId = e.body.resourceId ;
  if ( ! resourceId )
  {
    this._ejectSocket ( socket ) ;
    return ;
  }
  var currentSemaphoreOwner = this._semaphoreOwner[resourceId] ;
  if ( currentSemaphoreOwner )
  {
    if ( currentSemaphoreOwner !== conn )
    {
      conn._pendingAcquireSemaphoreRecourceIdList.remove ( resourceId ) ;
      this._pendingAcquireSemaphoreConnections.remove ( resourceId, conn ) ;
      return ;
    }
  }
  Log.info ( conn.toString() + "\n released semaphore=" + resourceId ) ;
  delete this._semaphoreOwner[resourceId] ;
  conn._ownedSemaphoresRecourceIdList.remove ( resourceId ) ;
  var nextSemaphoreOwner = this._pendingAcquireSemaphoreConnections.removeFirst ( resourceId ) ;
  if ( ! nextSemaphoreOwner )
  {
    return ;
  }
  this._setIsSemaphoreOwner ( nextSemaphoreOwner, resourceId ) ;
};
/**
 * Description
 * @method _ejectSocket
 * @param {} socket
 * @return 
 */
Broker.prototype._ejectSocket = function ( socket ) // TODO semaphore
{
  var i, rid ;
  var sid = socket.sid ;
  if ( ! sid ) return ;
  var conn = this._connections[sid] ;
  if ( ! conn ) return ;

  var uid  = conn.getCurrentlyProcessedMessageUid() ;
  if ( uid )
  {
    conn.setCurrentlyProcessedMessageUid ( "" ) ;
    var requesterMessage    = this._messagesToBeProcessed[uid] ;
    var requester_sid       = requesterMessage.getSourceIdentifier() ;
    var requesterConnection = this._connections[requester_sid] ;

    delete this._messagesToBeProcessed[uid] ;

    for ( i = 0 ; i < this._connectionList.length  ; i++ )
    {
      this._connectionList[i]._messageUidsToBeProcessed.remove ( uid ) ;
    }
    if ( requesterConnection )
    {
      requesterMessage.setIsResult() ;
      requesterMessage.control.status = { code:1, name:"warning", reason:"responder died unexpectedly." } ;
      requesterConnection.write ( requesterMessage ) ;
    }
    else
    {
      Log.log ( "Requester not found for result:\n" + requesterMessage.toString() ) ;
    }
  }

  if ( conn.eventNameList )
  {
    for  ( i = 0 ; i < conn.eventNameList.length ; i++ )
    {
      this._eventNameToSockets.remove ( conn.eventNameList[i], socket ) ;
    }
    conn.eventNameList.length = 0 ;
  }
  this._connectionList.remove ( conn ) ;
  for ( i = 0 ; i < conn._lockedResourcesIdList.length ; i++ )
  {
    delete this._lockOwner [ conn._lockedResourcesIdList ] ;
  }
  conn._lockedResourcesIdList.length = 0 ;
  for ( var i = 0 ; i < conn._ownedSemaphoresRecourceIdList.length ; i++ )
  {
    rid = conn._ownedSemaphoresRecourceIdList[i] ;
    delete this._semaphoreOwner[rid] ;
    var nextSemaphoreOwner = this._pendingAcquireSemaphoreConnections.removeFirst ( rid ) ;
    if ( ! nextSemaphoreOwner )
    {
      continue ;
    }
    this._setIsSemaphoreOwner ( nextSemaphoreOwner, rid ) ;
  }
  conn._pendingAcquireSemaphoreRecourceIdList.length = 0 ;
  conn._ownedSemaphoresRecourceIdList.length = 0 ;
  delete this._connections[sid] ;
  Log.info ( 'Socket disconnected, sid=' + sid ) ;
};
/**
 * Description
 * @method _closeAllSockets
 * @param {} exceptSocket
 * @return 
 */
Broker.prototype._closeAllSockets = function ( exceptSocket )
{
  if ( this.closing )
  {
    return ;
  }
  this.closing = true ;
  var list = Object.keys ( this._connections ) ;
  var e = new Event ( "system", "shutdown" ) ;
  for ( var i = 0 ; i < list.length ; i++ )
  {
    var conn = this._connections[list[i]] ;
    if ( conn.socket === exceptSocket )
    {
      continue ;
    }
    conn.socket.write ( e.serialize() ) ;
    conn.socket.end() ;
  }
};

/**
 * Description
 * @method listen
 * @param {} port
 * @param {} callback
 * @return 
 */
Broker.prototype.listen = function ( port, callback )
{
  if ( port ) this.port = port ;
  if ( ! this.port )
  {
    this.port = T.getProperty ( "gepard.port", 17501 ) ;
  }
  if ( typeof callback !== 'function' )
  {
    var thiz = this ;
    /**
     * Description
     * @return 
     */
    callback = function() { Log.notice ( 'server bound to port=' + thiz.port ); } ;
  }
  this.server.listen ( this.port, callback ) ;
};
/**
 * @method setConfig
 * @param {object} configJson
 * @return {void}
 */
Broker.prototype.setConfig = function ( obj )
{
  var key, host, patternList, nameMap, eventList, hostMap, i, s, pattern ;
  var accessibility = obj.accessibility ;
// T.log ( obj ) ;
  if ( accessibility )
  {
    this.whitelist = accessibility.whitelist ;
    if ( this.whitelist )
    {
      this._whitelist_map = {} ;
      for ( host in this.whitelist )
      {
        if ( host.indexOf ( "*" ) < 0 )
        {
          hostMap = {} ;
          hostMap.patternList = [] ;
          hostMap.nameMap = {} ;

          this._whitelist_map[host] = hostMap ;
          
          eventList = this.whitelist[host] ;
          for ( var i = 0 ; i < eventList.length ; i++ )
          {
            s = eventList[i] ;
            if ( s.indexOf ( "*" ) < 0 )
            {
              hostMap.nameMap[s] = true ;
            }
            else
            {
              s = s.replace ( /\./g, "\\." ).replace ( /\*/g, ".*" ) ;
              hostMap.patternList.push ( new RegExp ( s ) ) ;
            }
          }
        }
        else
        {
          hostMap = {} ;
          hostMap.patternList = [] ;
          hostMap.nameMap = {} ;
          pattern = host.replace ( /\./g, "\\." ).replace ( /\*/g, ".*" ) ;
          hostMap.regexp = new RegExp ( pattern ) ;
          this._whitelist_patternList = [] ;
          this._whitelist_patternList.push ( hostMap ) ;
// console.log ( "host=" + host ) ;

          eventList = this.whitelist[host] ;
// T.log ( eventList ) ;
          for ( var i = 0 ; i < eventList.length ; i++ )
          {
            s = eventList[i] ;
            if ( s.indexOf ( "*" ) < 0 )
            {
              hostMap.nameMap[s] = true ;
            }
            else
            {
              s = s.replace ( /\./g, "\\." ).replace ( /\*/g, ".*" ) ;
              hostMap.patternList.push ( new RegExp ( s ) ) ;
            }
          }
        }
      }
    }
    var blacklist = accessibility.blacklist ;
// T.log ( this._whitelist_map )
// T.log ( this._whitelist_patternList )
  }
};
module.exports = Broker ;

if ( require.main === module )
{
  var Admin = require ( "./Admin" ) ;
  var Gepard = require ( "./Gepard" ) ;
  var what = T.getProperty ( "help" ) ;
  if ( what )
  {
    console.log ( "Broker for Gepard" ) ;
    console.log ( "Usage: gp.broker [Options] [Gepard-options]" ) ;
    console.log ( "Options are:" ) ;
    console.log ( "  --help \t display this text" ) ;
    console.log ( "  --web \t start also the WebSocketEventProxy" ) ;
    console.log ( "The form -D<name>[=<value> or --<name>[=<value>] are aquivalent." ) ;
    console.log ( "Gepard-options are:" ) ;
    console.log ( "  --gepard.port=<port> \t tcp connection port" ) ;
    console.log ( "      default is environment variable GEPARD_PORT or 17501" ) ;
    return ;
  }

  new Admin().isRunning ( function admin_is_running ( state )
  {
    if ( state )
    {
      console.log ( "Already running" ) ;
      return ;
    }
    execute() ;
  });
  function execute()
  {
    var logDir = Gepard.getLogDirectory() ;
    Log.init ( "level=info,Xedirect=3,file=%GEPARD_LOG%/%APPNAME%.log:max=1m:v=4") ;

    var b = new Broker() ;
    // if ( T.getProperty ( "config" ) )
    // {
    //   var str = fs.readFileSync ( T.getProperty ( "config" ), 'utf8' ) ;
    //   b.setConfig ( JSON.parse ( str ) ) ;
    // }
    b.listen() ;
    if ( T.getBool ( "web", false ) )
    {
      var WebSocketEventProxy = require ( "./WebSocketEventProxy" ) ;
      var wse = new WebSocketEventProxy() ;
      wse.listen() ;
      b.on ( "shutdown", function onshutdown(e)
      {
        wse.shutdown() ;
        process.exit ( 0 ) ;
      });
    }
  }
}
