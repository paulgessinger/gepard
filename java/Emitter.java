import org.gessinger.gepard.* ;

public class Emitter
{
  static public void main ( String[] args )
  {
    Util.argsToProperties ( args ) ;
    try
    {
      Emitter j = new Emitter() ;
    }
    catch ( Exception exc )
    {
      exc.printStackTrace() ;
    }
  }
  Emitter()
  throws Exception
  {
    Client client = Client.getInstance() ;
    String name = Util.getProperty ( "name", "ALARM" ) ;
    client.emit ( name, new FailureCallback()
    {
      public void failure ( Event e )
      {
        System.out.println ( e ) ;
      }
    } ) ;
    Thread.sleep ( 1000 ) ;
    client.close() ;
  }
}
