/*
* @Author: Hans Jürgen Gessinger
* @Date:   2016-03-01 12:48:16
* @Last Modified by:   HG02055
* @Last Modified time: 2016-03-07 19:51:54
*/

var Service = function ( srv )
{
	this.name     = srv.name.substring ( 0, srv.name.indexOf ( '-' ) ) ;
	this.type     = srv.type ;
	this.port     = srv.port ;
	this.host     = srv.host ;
	this.topics   = srv.txt["topics"].split ( ',' ) ;
	this.channels = srv.txt.channels.split ( ',' ) ;
	// console.log ( srv ) ;
};
Service.prototype.getName = function() { return this.name ; } ;
Service.prototype.getType = function() { return this.type ; } ;
Service.prototype.getPort = function() { return this.port ; } ;
Service.prototype.getHost = function() { return this.host ; } ;
Service.prototype.getTopics = function() { return this.topics ; } ;
Service.prototype.getChannels = function() { return this.channels ; } ;
Service.prototype.isReconnect = function() { return this._isReconnect ; } ;
Service.prototype.setIsReconnect = function( state ) { this._isReconnect = state ; } ;
Service.prototype.toString = function()
{
	return "(Service)[name=" + this.name + ",type=" + this.type + ",host=" + this.host + ",port=" + this.port + "]" ;	
} ;
Service.prototype.isLocalHost = function()
{
	var os = require ( "os" ) ;
  if ( this.host.toUpperCase() === os.hostname().toUpperCase() )
  {
    return true ;
  }
  return false ;
};

module.exports = Service ;
