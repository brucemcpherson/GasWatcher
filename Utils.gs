var Utils = (function(ns) {
  
  /**
  * get the stack
  * @return {string} the stack trace
  */
  ns.errorStack = function(e) {
    try {
      // throw a fake error
      throw new Error();  //x is undefined and will fail under use struct- ths will provoke an error so i can get the call stack
    }
    catch(err) {
      return 'Error:' + e + '\n' + err.stack.split('\n').slice(1).join('\n');
    }
  }
   /**
  * @param {[*]} arguments unspecified number and type of args
  * @return {string} a digest of the arguments to use as a key
  */
  ns.keyDigest = function () {
    // conver args to an array and digest them
    return Utilities.base64Encode (
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1,Array.prototype.slice.call(arguments).map(function (d) {
        return (Object(d) === d) ? JSON.stringify(d) : d.toString();
      }).join("-")));
  };
  /**
   * this is clone that will really be an extend
   * @param {object} cloneThis
   * @return {object} a clone
   */
  ns.clone = function (cloneThis) {
    return ns.vanExtend ({} , cloneThis);
  }
  /**
  * recursively extend an object with other objects
  * @param {[object]} obs the array of objects to be merged
  * @return {object} the extended object
  */
  ns.vanMerge = function(obs) {
    return (obs || []).reduce(function(p, c) {
      return ns.vanExtend(p, c);
    }, {});
  };
  /**
  * recursively extend a single obbject with another 
  * @param {object} result the object to be extended
  * @param {object} opt the object to extend by
  * @return {object} the extended object
  */
  ns.vanExtend = function(result, opt) {
    result = result || {};
    opt = opt || {};
    return Object.keys(opt).reduce(function(p, c) {
      // if its an object
      if (ns.isVanObject(opt[c])) {
        p[c] = ns.vanExtend(p[c], opt[c]);
      } else {
        p[c] = opt[c];
      }
      return p;
    }, result);
  };
  /**
  * use a default value if undefined
  * @param {*} value the value to test
  * @param {*} defValue use this one if undefined
  * @return {*} the new value
  */
  ns.fixDef = function(value, defValue) {
    return typeof value === typeof undefined ? defValue : value;
  };
  /**
  * see if something is undefined
  * @param {*} value the value to check
  * @return {bool} whether it was undefined
  */
  ns.isUndefined = function(value) {
    return typeof value === typeof undefined;
  };
  /**
  * simple test for an object type
  * @param {*} the thing to test
  * @return {bool} whether it was an object
  */
  ns.isVanObject = function(value) {
    return typeof value === "object" && !Array.isArray(value);
  }
  
  return ns;
})(Utils || {});

