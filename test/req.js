#!/usr/bin/env node
var util = require ( "util" ) ;
var gepard = require ( "gepard" ) ;
var name   = gepard.getProperty ( "name", "ack" ) ;
var c      = gepard.getClient() ;

c.request ( name,
  function(e)
  {
  	console.log ( util.inspect ( e, { showHidden: false, depth: null } ) ) ;
    this.end() ;
  }
);
