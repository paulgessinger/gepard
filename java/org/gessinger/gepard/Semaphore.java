package org.gessinger.gepard ;
import java.io.IOException ;
public class Semaphore
{
  static public void main ( String[] args )
  {
    Util.argsToProperties ( args ) ;
    try
    {
System.out.println ( "1 --------------------" ) ;
      final Semaphore sem = new Semaphore ( "user:10000" ) ;
System.out.println ( Util.LineInfo ) ;
      sem.acquire(5000) ;
//       sem.acquire ( new SemaphoreCallback()
//       {
//         public void acquired ( Event e )
//         {
// System.out.println ( "2 --------------------" ) ;
// System.out.println ( Util.LineInfo ) ;
//           System.out.println ( sem ) ;
//           try
//           {
//             Thread.sleep ( 1000 ) ;
//             sem.release() ;
//           }
//           catch ( Exception exc )
//           {
//             System.out.println ( Util.toString ( exc ) ) ;
//           }
//         }
//       }) ;
System.out.println ( Util.LineInfo ) ;
// System.out.println ( "sleep ----------------------------" ) ;
      Thread.sleep ( 10000 ) ;
      sem.release() ;
      // client.close() ;
    }
    catch ( Exception exc )
    {
      exc.printStackTrace() ;
    }
  }
  Client client = null ;
  String resourceId = "" ;
  SemaphoreCallback scb = null ;
  boolean _isOwner = false ;
  long timeoutMillis = -1 ;
  boolean hasCallback()
  {
    return scb != null ;
  }
  public Semaphore ( String resourceId )
  {
    this ( resourceId, -1, null ) ;
  }
  public Semaphore ( String resourceId, int port )
  {
    this ( resourceId, port, null ) ;
  }
  public Semaphore ( String resourceId, int port, String host )
  {
    this.client = Client.getInstance ( port, host ) ;
    this.resourceId = resourceId ;
  }
  public String toString()
  {
    return "(" + getClass().getName() + ")[resourceId=" + resourceId + ",isOwner=" + isOwner() + "]" ;
  }
  public Client getClient()
  {
    return client ;
  }
  public boolean isOwner()
  {
    return _isOwner ;
  }
  public void acquire()
  throws IOException
  {
    this.scb = null ;
    client.acquireSemaphore ( this ) ;
  }
  public void acquire ( long millis )
  throws IOException
  {
    this.scb = null ;
    timeoutMillis = millis ;
    client.acquireSemaphore ( this ) ;
  }
  public void acquire ( SemaphoreCallback scb )
  throws IOException
  {
    this.scb = scb ;
    client.acquireSemaphore ( this ) ;
  }
  public void release()
  throws IOException
  {
    this.scb = null ;
    client.releaseSemaphore ( this ) ;
  }
}
