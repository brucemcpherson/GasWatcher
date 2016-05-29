
/**
 * simulate Watcher with apps script
 * various changes server side can be watched for server side
 * and resolved client side
 * @constructor ClientWatcher
 */
var ClientWatcher = (function (ns) {
  
  var watchers_  = {};

  // now clean it
  function cleanTheCamel_ (cleanThis) {
    return typeof cleanThis === "string" ? cleanThis.slice(0,1).toUpperCase() + cleanThis.slice(1) : cleanThis;
  }
  
  /**
  * return {object} all current Watchers, the id is the key
   */
  ns.getWatchers = function () {
    return watchers_;
  };
  
  /**
   * add a Watcher
   * @param {object} options what to watch
   * @param {string} [sheet] the sheet to watch if missing, watch the active sheet
   * @param {string} [range] the range to watch - if missing, watch the whole sheet 
   * @param {string} [property=Data] matches getData, getBackground
   * @param {TYPES} [type=SHEET] the type of Watcher
   * @param {number} pollFrequency in ms, how often to poll
   * @return {ClientWatcher.Watcher} the Watcher
   */
  ns.addWatcher = function (options) {
    
    // default settings for a Watcher request
    var watch = Utils.vanMerge ([{
      pollFrequency:2500,
      id: '' ,                                        // Watcher id
      watch: {
        active: true,                                 // whether to watch for changes to active
        data: true                                    // whether to watch for data content changes
      },
      checksum:{
        active:"",                                    // the active checksum last time polled
        data:""                                       // the data checksum last time polled
      },                                
      domain: {
        app: "Sheets",                                // for now only Sheets are supported                     
        scope: "Sheet",                               // sheet, or range - sheet will watch the datarange
        range: "",                                    // if range, specifiy a range to watch
        sheet: "",                                    // a sheet name - if not given, the active sheet will be used
        property:"Values",                            // Values,Backgrounds etc...
        fiddler:true                                  // whether to create a fiddler to mnipulate data (ignored for nondata property)
      }        
    },options || {}]);
    
    // tidy up the parameter cases
    Object.keys(watch.domain).forEach(function(k) {
      watch.domain[k] = cleanTheCamel_ (watch.domain[k]);
    });
    watch.id = watch.id || ('w' + Object.keys(watchers_).length);

    // add to the registry
    return (watchers_[watch.id] = ns.newWatcher(watch));
  };
  
  /**
   * remove a Watcher
   * @param {string||object} id the id or object
   * @return {ClientWatcher} self
   */
  ns.removeWatcher = function (watcher) {
    var id = Utils.isVanObject(watcher) ? watcher.id : watcher;
    if (!id || watchers_[id]) {
      throw 'Watcher ' + id + ' doesnt exists - cannot remove';
    }
    watchers_[id].stop();
    watchers_[id] = null;
    return ns;
  };
  /**
   * return a specifc Watcher
   * @param {string} id the Watcher
   * @return {ClientWatcher.watcher} the Watcher
   */
  ns.getWatcher = function (id) {
    return watchers_[id];
  };

  /**
   * used to create a new Watcher object
   * @return {ClientWatcher.Watcher}
   */
  ns.newWatcher = function (watch) {
    return new ns.Watcher(watch);
  }
  /**
   * this is a Watcher object
   * @param {object} watch the Watcher resource
   * @return {ClientWatcher.Watcher}
   */
  ns.Watcher = function (watch) {
    
    var self = this;
    var current_ = {
      active:null,
      data:null
    } ;
    var watch_ = watch, stopped_ = false;    
    
    // this monitors requests
    var status_ = {
      serial:0,      // the serial number of the poll
      requested:0,   // time  requested
      responded:0,    // time responded
      errors:0 ,      // number of errors
      hits:0,         // how many times a change was detected
      totalWaiting:0  //  time spent waiting for server response
    };
    
    self.start = function () {
      // get started
      return nextPolling_();
    };
    
    self.stop = function () {
      stopped_ = true;
    }
    /**
    * if you want the current data
    * @return {object} the current data
    */
    self.getCurrent = function () {
      return current_;
    };
    
    /**
     * if you want the latest status
     * @return {object} status
     */
    self.getStatus = function () {
      return status_;
    };
    
    /**
     * do the next polling after waiting some time
     * @return {Promise}
     */
    function nextPolling_ () {
      return new Promise(function (resolve,reject) {
        setTimeout ( function () {
          self.poll()
          .then(function(pack) {
            resolve(pack);
          })
          ['catch'](function(pack) {
            reject(pack);
          })
        }, status_.serial ? watch_.pollFrequency : 10);
      });
      
    }

    // convenience function to endlessly poll and callback on any changes
    self.watch = function (callback) {
      if (typeof callback !== "function") {
        throw 'callback to .watch() must be a function';
      }
      self.start()
      .then (function(pack) {

        if (pack.changed.active || pack.changed.data) {
          callback(current_, pack, self);
        }
        if (!stopped_) {
          self.watch(callback);
        }
      });
    };
    
    /**
     * this returns a promise
     * which will be resolved when the server sends back changed data
     * and rejected when there is no change
     * @return {Promise}
     */
    self.poll = function () {
      
      status_.requested = new Date().getTime();
      status_.serial ++; 
      
      return new Promise(function (resolve, reject) {

        Provoke.run ("ServerWatcher", "poll", watch_)
        .then (
          function (pack) {
            status_.responded = new Date().getTime();
            status_.totalWaiting += (status_.responded - status_.requested);
            // if there's been some changes, then store them
            if(pack.active) {
              current_.active = pack.active;
              watch_.checksum.active = pack.checksum.active;
            }
            if (pack.data) {
              current_.data = pack.data;
              watch_.checksum.data = pack.checksum.data;
              if (watch_.domain.fiddler && watch_.domain.property === "Data") {
                current_.fiddler = new Fiddler().setValues(current_.data);
              }
            }
            if (pack.data || pack.active) {
              status_.hits++;
            }
            resolve (pack);
          })
        ['catch'](function (err) {
          // sometimes there will be network errors which can generally be ignored..
          // pity there is no finally() in promises yet...
          console.log (err);
          status_.errors++;
          status_.responded = new Date().getTime();
          status_.totalWaiting += (status_.responded - status_.requested);
          reject(pack);
        });
      });
    };
    
  };
  
  return ns;
})(ClientWatcher || {});

