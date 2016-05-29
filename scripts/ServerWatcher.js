/**
* used to expose memebers of a namespace
* @param {string} namespace name
* @param {method} method name
*/
function exposeRun (namespace, method , argArray ) {
  var func = (namespace ? this[namespace][method] : this[method])
  if (argArray && argArray.length) {
    return func.apply(this,argArray);
  }
  else {
    return func();
  }
}
/**
 * simulate binding with apps script
 * various changes server side can be watched for server side
 * and resolved client side
 * @constructor SeverBinder
 */
var ServerWatcher = (function (ns) {
  
  
  /**
   * polled every now and again to report back on changes
   * @param {object} watch instructions on what to check
   * @retun {object} updated status
   */
  ns.poll = function (watch) {
    
    // get the active stuff
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getActiveSheet();
    
    // the whole sheet/partial sheet/the active sheet/a specific sheet
    var s = watch.domain.sheet ? ss.getSheetByName(watch.domain.sheet) : sh;
    var r = watch.domain.range ? s.getRange(watch.domain.range) : s.getDataRange();
    
    // start building the result
    var pack = {
      checksum:watch.checksum,
      changed:{}
    };

    // get data if requested
    if (watch.watch.data) {
      var values = r['get'+watch.domain.property]();
      var cs = Utils.keyDigest(values);
      pack.changed.data = cs !== pack.checksum.data;
      if (pack.changed.data) {
        pack.data = values;
        pack.checksum.data = cs;
      }
    }
    
    // provide active if requested
    if (watch.watch.active) {
      var a = {
        id:ss.getId(),
        sheet:sh.getName(),
        range:sh.getActiveRange().getA1Notation(),
        dataRange:sh.getDataRange().getA1Notation()
      }
      var cs = Utils.keyDigest (a);
      pack.changed.active = cs !== pack.checksum.active;
      if (pack.changed.active) {
        pack.active = a;
        pack.checksum.active = cs;
      }
      
    }
    return pack;

  };
  return ns;
})(ServerWatcher || {});
