#!/usr/bin/env node

var net   = require('net');
var Event = require ( "./Event" ) ;
var T     = require ( "./Tango" ) ;

/**
 * @constructor
 * @class Admin tool for Gepard
 * @method Admin
 * @param {} port
 * @param {} host
 * @return 
 */
var Admin = function ( port, host )
{
	this.port = T.getProperty ( "gepard.port", port ) ;
	if ( ! this.port )
	{
		this.port = 17501 ;
	}
	this.host = T.getProperty ( "gepard.host", host ) ;
};
/**
 * Shutdown GPBroker
 * @method shutdown
 * @param {} what
 * @return 
 */
Admin.prototype.shutdown = function ( what )
{
	this._execute ( "shutdown", what ) ;
};
/**
 * Display an info from GPBroker
 * @method info
 * @param {} what
 * @return 
 */
Admin.prototype.info = function ( what, callback )
{
	this._execute ( "info", what, callback ) ;
};
/*
 */
Admin.prototype.isRunning = function ( callback )
{
	var thiz = this ;
	try
	{
		this.socket = net.connect ( { port: this.port, host: this.host } ) ;
		this.socket.on ( 'error', function socket_on_error( data )
		{
			callback.call ( null, false ) ;
		});
		this.socket.on ( "connect", function()
		{
			callback.call ( null, true ) ;
			thiz.socket.end() ;
		});
	}
	catch ( exc )
	{
	}
};

Admin.prototype._execute = function ( action, what, callback )
{
	try
	{
		this.socket = net.connect ( { port: this.port, host: this.host } ) ;
	}
	catch ( exc )
	{
		console.log ( "Not running" ) ;
		return ;
	}
	if ( action === "shutdown" )
	{
		this.socket.on ( "connect", function()
		{
		  var e = new Event ( "system", "shutdown" ) ;
		  if ( what )
		  {
		  	e.body.shutdown_sid = what ;
		  }
		  this.write ( e.serialize() ) ;
		  if ( ! what )
		  {
		  	return ;
		  }
		});
		// return ;
	}
	else
	{
		this.socket.on ( "connect", function()
		{
		  var e = new Event ( "system", "getInfoRequest" ) ;
		  e.body.info_type = what ;
		  this.write ( e.serialize() ) ;
		});
	}
	this.socket.on ( 'error', function socket_on_error( data )
	{
		console.log ( "Not running" ) ;
		// T.lwhere (  ) ;
		// T.log ( data ) ;
	});
	this.socket.on ( 'end', function socket_on_end( data )
	{
		// T.lwhere (  ) ;
	});
	this.socket.on ( 'data', function ondata ( data )
	{
		var list, i, desc, str, app, l ;
    var mm = data.toString() ;
    if ( ! this.partialMessage ) this.partialMessage = "" ;
    mm = this.partialMessage + mm ;
    this.partialMessage = "" ;
    var result = T.splitJSONObjects ( mm ) ;
    var messageList = result.list ;
    var i, j, k ;
    var ctx, uid, rcb, e, callbackList ;
    for ( j = 0 ; j < messageList.length ; j++ )
    {
      if ( this.stopImediately )
      {
        return ;
      }
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
		    var e = Event.prototype.deserialize ( m ) ;
		    if ( e.getType() === "getInfoResult" )
		    {
		    	if ( what === "conn" )
		    	{
		    		list = e.body.connectionList ;
	    			if ( callback )
	    			{
	    				callback.call ( null, list ) ;
	    				return ;
	    			}
		    		if ( ! list || ! list.length )
		    		{
			    		console.log ( "No Connections" ) ;
		    		}
		    		else
		    		{
			    		for ( i = 0 ; i < list.length ; i++ )
			    		{
			    			desc = list[i] ;
			    			str = desc.application ;
			    			console.log ( "%s\t%s:%s", desc.sid, desc.hostname, desc.applicationName ) ;
		    			}
			    	}
		    	}
		    	else
		    	if ( what === "lock" )
		    	{
		    		list = e.body.lockList ;
	    			if ( callback )
	    			{
	    				callback.call ( null, list ) ;
	    				this.end() ;
	    				return ;
	    			}
		    		if ( ! list || ! list.length )
		    		{
		    			console.log ( "No locks" ) ;
		    		}
		    		else
		    		{
			    		for ( i = 0 ; i < list.length ; i++ )
			    		{
			    			desc = list[i] ;
			    			str = desc.owner.application ;
			    			console.log ( "%s\t%s\t%s:%s", desc.resourceId, desc.owner.sid, desc.owner.hostname, desc.owner.applicationName ) ;
			    		}
		    		}
		    	}
		    	else
		    	if ( what === "sem" )
		    	{
		    		list = e.body.semaphoreList ;
	    			if ( callback )
	    			{
	    				callback.call ( null, list ) ;
	    				this.end() ;
	    				return ;
	    			}
		    		if ( ! list || ! list.length )
		    		{
		    			console.log ( "No semaphores" ) ;
		    		}
		    		else
		    		{
			    		for ( i = 0 ; i < list.length ; i++ )
			    		{
			    			desc = list[i] ;
			    			str = desc.owner.application ;
			    			console.log ( "%s\t%s\t%s:%s", desc.resourceId, desc.owner.sid, desc.owner.hostname, desc.owner.applicationName ) ;
			    		}
		    		}
		    	}
		    	else
		    	if ( what === "events" )
		    	{
		    		var mapping = e.body.mapping ;
		    		var pattern = e.body.currentEventPattern ;
	    			if ( callback )
	    			{
	    				callback.call ( null, mapping ) ;
	    				this.end() ;
	    				return ;
	    			}
		    		if ( ! mapping )
		    		{
		    			console.log ( "No event listener" ) ;
		    		}
		    		else
		    		{
		    			for ( var eventName in mapping )
		    			{
		    				var l = mapping[eventName] ;
			    			console.log ( "%s\t%s", eventName, l ) ;
		    			}
		    		}
		    	}
		    	else
		    	{
		    		T.log ( e ) ;
		    	}
		    }
		    else
		    {
			    T.log ( e ) ;
		    }
		  }
		}
	  this.end();
	});
};
Admin.prototype.getInfoForApplication = function ( applicationName, callback )
{
	this.info ( "conn", function lsconn ( list )
	{
		var al = [] ;
		if ( ! list || ! list.length ) return al ;
		for ( var i = 0 ; i < list.length ; i++ )
		{
			if ( list[i].applicationName === applicationName )
			{
				al.push ( list[i] ) ;
			}
		}
		callback.call ( null, al ) ;
	});
};
Admin.prototype.getNumberOfApplications = function ( applicationName, callback )
{
	var thiz = this ;
	this.info ( "conn", function lsconn ( list )
	{
		var n = 0 ;
		if ( ! list || ! list.length )
		{
			callback.call ( null, n ) ;
		  thiz.socket.end() ;
			return ;
		}
		for ( var i = 0 ; i < list.length ; i++ )
		{
			if ( list[i].applicationName === applicationName )
			{
				n++ ;
			}
		}
		callback.call ( null, n ) ;
	  thiz.socket.end() ;
	});
};
module.exports = Admin ;
if ( require.main === module )
{
	var port = T.getProperty ( "gepard.port", 17501 ) ;
	var host = T.getProperty ( "gepard.host" ) ;

	var ad = new Admin ( port, host ) ;

	var what = T.getProperty ( "help" ) ;
	if ( what )
	{
		console.log ( "Admin tool for Gepard" ) ;
		console.log ( "Usage: node Admin.js [ options ]" ) ;
		console.log ( "Options are:" ) ;
		console.log ( "  --help" ) ;
		console.log ( "      display this text" ) ;
		console.log ( "  -Dinfo[=<value>]" ) ;
		console.log ( "      without <value>: display all available information from the broker" ) ;
		console.log ( "      Allowed values are:" ) ;
		console.log ( "        conn      list all connections" ) ;
		console.log ( "        lock      list all locks" ) ;
		console.log ( "        sem       list all semaphores" ) ;
		console.log ( "        events    list all event-names listened to" ) ;
		console.log ( "  -Dshutdown[=<connectin-id>]" ) ;
		console.log ( "      without <connection-id>: send a shutdown event" ) ;
		console.log ( "        to all clients and shutdown the broker." ) ;
		console.log ( "      with <connection-id>: send a shutdown event" ) ;
		console.log ( "        to the specified client and close the connection." ) ;
		console.log ( "The form -D<name>[=<value> or --<name>[=<value>] are aquivalent." ) ;
		return ;
	}
	what = T.getProperty ( "shutdown" ) ;
	if ( what )
	{
		if ( what === "true" ) what = null ;
		ad.shutdown ( what ) ;
		return ;
	}
	what = T.getProperty ( "run" ) ;
	if ( what  )
	{
		if ( what === "true" )
		{
			console.log ( "Missing application name for -Drun=<" ) ;
			return ;
		}
		ad.getNumberOfApplications ( what, function getNumberOfApplications ( n )
		{
console.log ( "n=" + n ) ;
		} ) ;
// 		ad.getInfoForApplication ( what, function getInfoForApplication ( list )
// 		{
// console.log ( list ) ;
// 		} ) ;
		return ;
	}
	what = T.getProperty ( "isRunning" ) ;
	if ( what  )
	{
		ad.isRunning ( function admin_is_running ( state )
		{
			if ( state )
			{
				process.exit  ( 0 ) ;
				return ;
			}
			process.exit  ( 1 ) ;
			return ;
		});
		return ;
	}
	what = T.getProperty ( "info", "true" ) ;
	if ( what )
	{
		if ( what !== "true" )
		{
			ad.info ( what ) ;
		}
		else
		{
			ad.info() ;
		}
		return ;
	}
	return ;
}
