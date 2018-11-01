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
  * watches for changes in the sheets app
  * @param {object} watch
  * @return {object} the results
  */
  function watchSheets_ (watch) {
    // get the active stuff
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getActiveSheet();
    var aRange = ss.getActiveRange();
    
    // first select the sheet .. given or active
    var s = watch.domain.sheet ? ss.getSheetByName(watch.domain.sheet) : sh;
    
    // if the scope is "sheet", then it will always be the datarange used
    if (watch.domain.scope === "Sheet") {
      var r = s.getDataRange();
    }
    
    // the scope is range - if there's a given range use it - otherwise use the datarange on the selected sheet
    else if (watch.domain.scope === "Range") {
      var r = (watch.domain.range ? sh.getRange(watch.domain.range) : sh).getDataRange();
    }
    
    // regardless of any other settings always use the active range
    else if (watch.domain.scope === "Active") {
      var r = aRange;
    }
    
    // otherwise its a mess up
    else {
      throw 'scope ' + watch.domain.scope + ' is not valid scope - should be Sheet, Range or Active';
    }
    
    // start building the result
    var pack = {
      checksum:watch.checksum,
      changed:{},
      dataSource:{
        id:ss.getId(),
        sheet:sh.getName(),
        range:r.getA1Notation(),
        dataRange:sh.getDataRange().getA1Notation()
      }
    };
    
    // get data if requested
    if (watch.watch.data) {
      
      // see if filters are being respected
      if (watch.domain.applyFilters && watch.domain.property === "Values") {
        
        var values = new SheetsMore.SheetsMore()
        .setAccessToken(ScriptApp.getOAuthToken())
        .setId(SpreadsheetApp.getActiveSpreadsheet().getId())
        .setApplyFilterViews(false)
        .applyFilters()
        .getValues(r)
        .filteredValues;
        
      }
      else {
        var values = r['get'+watch.domain.property]();
      }
      var cs = Utils.keyDigest(values);
      pack.changed.data = cs !== pack.checksum.data;
      if (pack.changed.data) {
        pack.data = values;
        pack.checksum.data = cs;
      }
    }
    
    // provide sheets if requested
    if (watch.watch.sheets) {
      var sheets = ss.getSheets().map(function(d) { return d.getName(); });
      var cs = Utils.keyDigest(sheets);
      pack.changed.sheets = cs !== pack.checksum.sheets;
      if (pack.changed.sheets) {
        pack.sheets = sheets;
        pack.checksum.sheets = cs;
      }
    }
    
    // provide active if requested
    if (watch.watch.active) {
      var a = {
        id:ss.getId(),
        sheet:sh.getName(),
        range:aRange.getA1Notation(),
        dataRange:sh.getDataRange().getA1Notation(),
        dimensions: {
          numRows : aRange.getNumRows(),
          numColumns : aRange.getNumColumns(),
          rowOffset : aRange.getRowIndex(),
          colOffset : aRange.getColumn()
        }
      }
      var cs = Utils.keyDigest (a);
      pack.changed.active = cs !== pack.checksum.active;
      if (pack.changed.active) {
        pack.active = a;
        pack.checksum.active = cs;
      }
      
    }
    return pack;
    
  }
  /**
  * watches for changes in the docs app
  * @param {object} watch
  * @return {object} the results
  */
  function watchDocs_ (watch) {
    
    // get the active stuff
    var doc = DocumentApp.getActiveDocument();
    
    // the position
    var cursor = doc.getCursor();
    
    // calculate the index in the document
    var cursorOb = cursor ? {
      path:pathInDocument_(cursor.getElement()),
      offset:cursor.getOffset(),
      surroundingTextOffset:cursor.getSurroundingTextOffset()
    } : null;
    
    // get the active selection
    var selection = doc.getSelection();
    var selectionOb = rangeToPath (selection);
    
    // the valueRange is where the data is picked up from 
    
    // if its a named range then get that
    if (watch.domain.scope.toLowerCase() === "range") {
      var namedRanges = doc.getNamedRanges(watch.domain.range);
      if (!namedRanges || namedRanges.length !== 1) {
        throw 'missing or ambiguous named range ' + watch.domain.range;
      }
      var valueRange = namedRanges[0].getRange();
    }
    
    else if (watch.domain.scope.toLowerCase() === "active") {
      var valueRange = selection;
    }
    
    else if (watch.domain.scope.toLowerCase() === "doc") {
      // if its the whole document, there is no value range
      var valueRange = null;
    }
    
    else if (watch.domain.scope.toLowerCase() === "path") {
      var valueRange = pathToElem (doc,watch.domain.range);
    }
    
    else {
      throw 'scope ' + watch.domain.scope + ' is not valid scope - should be Doc, Range or Active';
    }
    
    // start building the result
    var pack = {
      checksum:watch.checksum,
      changed:{},
      cursor:cursorOb,
      selection:selectionOb,
      dataSource:{
        id:doc.getId(),
        range:valueRange ? rangeToPath(valueRange) : null 
      }
    };
    
    
    // get data if requested
    if (watch.watch.data) {
      
      var dataContent = valueRange ? rangeToText (valueRange) : doc.getBody().editAsText().getText();
      var cs = Utils.keyDigest(dataContent);
      
      pack.changed.data = cs !== pack.checksum.data;
      if (pack.changed.data) {
        pack.data = dataContent;
        pack.checksum.data = cs;
      }
    }
    
    
    // provide active if requested
    if (watch.watch.active) {
      var a = {
        id:doc.getId(),
        name:doc.getName(),
        selection:selectionOb,
        cursor:cursorOb
      }
      var cs = Utils.keyDigest (a);
      pack.changed.active = cs !== pack.checksum.active;
      if (pack.changed.active) {
        pack.active = a;
        pack.checksum.active = cs;
      }
      
    }
    
    function pathToElem (doc, pathOb) {
      if (!pathOb || !pathOb.path) {
        throw 'you need to specify a path object to be able to watch a path';
      }
      // skip the body index
      var p = pathOb.path.split (".").slice(1);
      
      var elem = doc.getBody();
      p.forEach (function (d) {
        try {
          Logger.log(parseInt(d,10));
          elem = elem.getChild (parseInt(d,10));
          Logger.log(elem.editAsText().getText());
        }
        catch (err) {
          throw 'error getting child ' + d + ' in ' + pathOb.path + '(' + err + ')';
        }
      });
      
      // now we're positioned at the right place - need to build a range
      var build = doc.newRange();
      if (pathOb.partial) {
        build.addElement(elem, pathOb.offset, pathOb.endOffsetInclusive);
      }
      else {
        build.addElement(elem);
      }
      return build.build();
    
    }
    function rangeToPath (rng) {
      return rng ? {
        items: rng.getRangeElements().map(function (d) {
          return {
            path:pathInDocument_(d.getElement()),
            offset:d.getStartOffset(),
            partial:d.isPartial(),
            endOffsetInclusive:d.getEndOffsetInclusive(),
            type:d.getElement().getType().toString()
          };
        })
      } : null;
    }
    
    function rangeToText (rng) {
      console.log('in rangeToText' + rng.getRangeElements().length);
      return rng ? rng.getRangeElements().reduce(function(p,c) {
        var elem = c.getElement();
        // not all elements can be cast as text - just ignore those for now 
        
        try {
          var text = elem.asText().getText();
          if (c.isPartial()) {
            text = text.slice (c.getStartOffset() , c.getEndOffsetInclusive() +1);
          }
        }
        catch(err) {
          // enhancement might be to encode images
          text = "";
        }
        // might want to include some kind of element break here
        return p+text;
        
      },''): null;
    }
    return pack;
    
  }
  /**
  * polled every now and again to report back on changes
  * @param {object} watch instructions on what to check
  * @retun {object} updated status
  */
  ns.poll = function (watch) {
    
    if (watch.domain.app === "Sheets") {
      return watchSheets_ (watch)
    }
    else if (watch.domain.app === "Docs") {
      return watchDocs_ (watch);
    }
    else {
      throw watch.app + ' is not a valid app to watch';
    }
    
  };
  
  /**
  * calculates a path in the document of a given element
  * @param {Element} element the element
  * @return {string} an index into the document
  */
  function pathInDocument_ (element) {
    return makePath_ (element,[]).reverse().join (".");
    
    function makePath_ (element,path) {
      var parent = element.getParent();
      if (parent) {
        path.push( Utilities.formatString ( '%05d',  parent.getChildIndex(element)  ));
        makePath_( parent , path) ;
      }
      return path;
    }
  }
  return ns;
})(ServerWatcher || {});
