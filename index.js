var chokidar = require('chokidar');
var fs = require('fs');
var path = require('path');
var Client = require('ssh2').Client;
var watcher;

var myopts = {
  watchdir: '/tmp/mft/watch',
  remotedir: '',
  partial: '', // '.partial',
  deleteOnRename: true,
  privatekey: '',
  verifyRemotedir: true,
  conncnt: 0,
  connerr: '',
  conn: null,
  retryInterval: 30000 // 30 seconds
};

var sftpopts = {
  host: 'localhost',
  port: 22,
  username: '',
  password: '',
  keepaliveInterval: 10000,
  keepaliveCountMax: 50,
  concurrency: 10,
  debug: sftpDebug,
  // these settings are required for products that have not removed olader less secure algos 
  algorithms: {
    kex: ['diffie-hellman-group1-sha1',
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
          'diffie-hellman-group-exchange-sha256',
          'diffie-hellman-group14-sha1'],
    cipher: ['aes128-cbc',
          '3des-cbc','blowfish-cbc',
          'aes128-ctr','aes192-ctr',
          'aes256-ctr','aes128-gcm',
          'aes128-gcm@openssh.com',
          'aes256-gcm',
          'aes256-gcm@openssh.com'],
  },
  tryKeyboard: true,
  privateKey: ''
  };


var watchopts = {
  ignored: /[\/\\]\./,
  ignoreInitial: false,
  followSymlinks: false,
  persistent: true,
  depth: 0,
  awaitWriteFinish: { stabilityThreshold:2000, pollInterval: 100},
  alwaysStat: true,
  usePolling: true,
  interval: 100,
  binaryInterval: 300,
  ignorePermissionErrors: false,
  atomic: true
};

// Ex: node index.js -u <SFTP USER> -a <SFTP PASSWORD> -k <SFTP KEY> -h <SFTP_HOST> -p <SFTP PORT> -r <SFTP FOLDER> -v <0-5> 
var argv = require('yargs')
    .usage(
	'Usage: node index.js -putsftp.js: -u <SFTP_USER> -a <SFTP_PASSWORD> -k <SFTP_KEY> -h <SFTP_HOST> -p <SFTP_PORT> -r <SFTP_FOLDER> -l <WATCH_FOLDER>  -v <0-5> -s false'
    )
    .example('node watch-putsftp.js -u weblogic -a MyPassword -k /tmp/sftpkey -h localhost -p 22 -r /uploads -l /tmp/mft/watch/ -r /uploads/ -v 1 -s false')
    .option('u', {
        alias: 'user',
        describe: 'Username for the remote SFTP Server. '
    })
    .option('a', {
        alias: 'password',
        describe: 'Password for the remote SFTP Server. '
    })
    .option('k', {
        alias: 'key',
        describe: 'SSH Key location for the remote SFTP Server. '
    })
    .option('h', {
        alias: 'host',
        describe: 'Host name or IP for the remote SFTP Server. '
    })
    .option('p', {
        alias: 'port',
        default: 22,
        describe: 'Port for the remote SFTP Server. ',
        type: 'number'
    })
    .option('r', {
        alias: 'remote',
        describe: 'Remote folder where files are put for upload'
    })
    .option('v', {
        alias: 'verbose',
        describe: '1-5 LOW to HIGH. Sends log items to the STDOUT console for debugging purposes',
        default: 1,
        type: 'number'
    })
    .option('l', {
        alias: 'local',
        describe: 'Local watch folder where files are placed for upload'
    })
    .option('s', {
        alias: 'status',
        describe: 'Provides updates on file upload status',
        default: false,
        type: 'boolean'
    })
    .demand(['h','l'])
    .argv;

var log = function(lvl, data) {
  var mydata, mylvl;
  if (typeof lvl === 'number') {
    mydata = data; 
    mylvl = lvl;
  } else {
    mydata = lvl
    mylvl = 1;
  };
  var d = new Date();
  if (mylvl <= argv.v) {
    console.log(d +': ' +mydata);
  };
};


// for debugging sftp interactions
function sftpDebug(str) {
  log(5, 'sftpDebug: ' +str);
};

// handle errors amd retry sftp connection errors
function sftpOnError() {

  //listen for SSH client errors
  myopts.conn.on('error', function(err) {
    if (err) log (0, 'SSH Client ERROR: ' +err);
  });

  //listen for continue events()
  myopts.conn.on('continue', function() {
    log (3, 'sftp conn continue event received');
  });

  myopts.conn.on('error', function(err) {
    myopts.connerr = err.code; 
    myopts.conncnt++;
    log(0, 'sFTP conn ERROR:' +myopts.connerr);
    log(0, 'Pausing before reconnect ' +myopts.retryInterval/1000 +' seconds' +' ' +myopts.conncnt);
    setTimeout(function(){
      myopts.conn.connect(sftpopts);
    }, myopts.retryInterval);
  });

};

// create sftp connetion
function sftpConnect(cb) {
  if (myopts.conncnt++ === 0) { // first time
    sftpOnError();
    log(1, 'Connecting to sFTP Server');
    myopts.conn.connect(sftpopts);
  };
};

function main(cb) {
  sftpopts = getUserOpts(argv);
  myopts.connerr = '';
  myopts.conncnt = 0;

  myopts.conn = new Client();

  sftpConnect(function(err) {
    if (err) {
      log(0, ' main sftpConnect ERROR: ' +err +' ' +err.stack);
      throw err;
    };
  });

  // for mac https://github.com/mscdex/ssh2/issues/238
  myopts.conn.on('keyboard-interactive', function(name, instructions, instructionsLang, prompts, finish) {
   log(1, 'conn keyboard-interactive event:' +name);
   finish([sftpopts.password]);
  });

  // once sftp server connection is ready, start watching folder for new files
  myopts.conn.on('ready', function() {
    log(1, 'sftp: ready');
    myopts.connerr = '';
    myopts.conncnt = 0;

  if (myopts.verifyRemotedir === true) {
    myopts.verifyRemotedir=false;
     myopts.conn.sftp(function(err, sftpstream) {
        if (err) {
          log(0, 'main sftp ERROR: ' +err);
          return cb(err);
        } else {
          isDir(myopts.remotedir, sftpstream, function(err) {
            if (err) {
              var merr = 'upload sftp ERROR: ' +myopts.remotedir +' is not a directory ' +err;
              log(0, merr);
		process.exit(1); // get outta here
               throw err;
            };
          });
        };
      });
    };

    startWatching(function(err) {
      log(3, ' main istartWatching returned');
      //never reached in current implementation
      if (err)  {
        log(0, ' main startWatching ERROR: ' +err +' ' +err.stack);
        throw err;
      };
      // never reached in current implementation
      log(1, 'main returning to caller');
      return cb();
    });
  });

  myopts.conn.on('end', function() {
    log(1, 'sftp: end');
  });
  myopts.conn.on('close', function() {
    log(1, 'sftp: close: ');
    //log('sftp: close: reconnecting');
    //main(); // just restart it all
  });
};

function getUserOpts(argv) {
  myopts.remotedir = argv.r;
  //argv.patterns = argv._;
  // -u <SFTP USER> -a <SFTP PASSWORD> -k <SFTP KEY> -p <SFTP PORT> -f <SFTP FOLDER> -l <LOCAL_FOLDER>

  if (argv.h) sftpopts.host=argv.h;
  if (argv.p) sftpopts.port=argv.p;
  if (argv.u) sftpopts.username=argv.u;
  if (argv.a) sftpopts.password=argv.a;
  if (argv.k) sftpopts.privateKey = fs.readFileSync(argv.k);
  if (argv.l) myopts.watchdir = argv.l;

  //log(argv);
  //log(o);
  return sftpopts;
};


// do an sftp UNLINK command
function unlink(path, stream, cb) {
  log(3, 'unlink sftp entry: ' +path);
  var rc = stream.unlink(path, function(err) {
    log(3, 'unlink sftp callback : ' +path);
    if (err) {
      log(3, 'unlink file sftp callback ERROR: ' +path +' ' +err);
      // Swallow this error. The file just didn't exist before
      return cb('');
      //return cb(err);
    } else { 
      log(3, 'unlink/delete file sftp successful rc: ' +rc +' ' +path);
      return cb ('');
    };
  });
};

// do an sftp RENAME command
function rename(src, dest, stream, cb) {
  log(3, 'rename sftp entry: ' +src +' ' +dest);
  var pi = 1000;
  setTimeout(function(){
	log(4, 'rename pause ' +pi);
    	}, pi);
  if (myopts.deleteOnRename) {
    unlink(dest, stream, function(err) {
      if (err) {
        log(0, 'rename unlink sftp ERROR: ' +src +' ' +path +' ' +err);
        return cb(err);
      } else { 
        log(3, 'rename unlink sftp successful: ' +dest);
      };
    });
  };

  var rc = stream.rename(src, dest, function(err) {
    var pi = 2000;
    log(3, 'rename sftp callback : ' +src +' ' +dest);
    if (err) {
      log(3, 'rename sftp callback : "' +dest +'" "' +err.message +'"');
      if (dest == err.message) {
        log(1, 'rename sftp ERROR: cannot rename because the file exists ' +dest);
      } else {
        log(0, 'rename sftp ERROR: ' +src +' ' +dest +' ' +err);
      };
      return cb(err);
    } else { 
      log(3, 'rename sftp rc: ' +rc +' '+src +' ' +dest);
      return cb ('');
    };
  });
};

var isDir = function(path, stream, cb) {
  log(3, 'isDir sftp entry: ' +path);
  var rc = stream.opendir(path, function(err) {
    if (err) {
      return cb(err);
    } else {
      log(3, 'isdir sftp rc: ' +rc +' '+path);
      return cb ('');
    };
  });
};

// do an sftp PUT command
function upload(fpath, cb) {
  var RD = myopts.remotedir; // remote foldir
  var BN = path.basename(fpath); // remote path
  var TN = BN+myopts.partial; // temporary remote path 
  var rc;
  log(3, 'upload entry: ' +fpath +' ' +RD+TN +' ' +BN +' ' +TN);

  // handles sftp conn. 'Not connected' error
  if (!myopts.connerr) { // stop processing if we have an sftperr
    // this code should probably be put into its own function
    rc = myopts.conn.sftp(function(err, sftpstream) {
      if (err) {
        log(0, 'upload sftp invoke ERROR: ' +fpath +' ' +err);
        return cb (err);
      } else {
        log(3, 'upload sftp get stream resp:' +rc);
        if (rc !== true) log(3, 'upload sftp WARNING Consider using Continue Event');
        sftpstream.fastPut(fpath, RD+TN, {
            step: function ( totalTx, chunk, total ) {
            if (argv.s)
              log(0, 'Progress: ' +RD+TN +' TotalTx:' +totalTx + ' Chunk:' +chunk +' Total:' +total);
            }
          }, function(err) {
          if (err) {
            log(0, 'upload sftp fastPut ERROR: ' +fpath +' ' +err);
            return cb(err);
          };
          log(3, 'upload sftp.fastPut: ' +fpath +' ' +TN);
          if (myopts.partial) {
            log(4, 'upload sftp rename: ' +RD+TN +' ' +RD+BN);
	    rename(RD+TN, RD+BN, sftpstream, function(err) {
              if (err) {
                log(0, 'upload sftp fastPut ERROR: ' +fpath +' ' +err);
                return cb(err);
              }; 
              log(3, 'upload sftp rename successful ' +RD+TN +' ' +RD+BN);
              //log(1, 'upload sftp successful ' +fpath +' ' +RD+BN);
              //fs.unlink(fpath);
              //return cb ('');
	    });
          } // else {
          log(1, 'upload sftp successful ' +fpath +' ' +RD+BN);
          fs.unlink(fpath);
          return cb ('');
	  // };
        });
      };
    });
  };
};

function startWatching(cb) {
    if (watcher) watcher.close();
    log(3, 'startWatching watcher init');
    log(5, 'watcher watchdir: ', myopts.watchdir);
    watcher = chokidar.watch(myopts.watchdir, watchopts);
    watcher.on('ready', function() {
      log(1, 'watcher: ready');
    });

    // general purpose event handler not currently used
    watcher.on('all', function(event, fpath) {
      log(4, 'watcher all: ' +event +' ' +fpath);
    });

    watcher.on('error', function(err) {
      log(0, 'watcher ERROR: ' +err);
      // should handle these with killing the server at some point
      throw err;
    });

    watcher.on('add', function(fpath) {
      log(1, 'watcher add file: ' +fpath);
      upload(path.normalize(fpath), function(err) {
        if (err) {
  	  log(0, 'watcher upload ERROR: ' +err +' ' +fpath);
        };
      });
    });

    // various event handlers that do nothing but display the message
    watcher.on('addDir', function(fpath) {
      log(3, 'watcher addDir: ' +fpath);
    });

    // since we delete files after processed, change events are not handled.
    watcher.on('change', function(fpath, stats) {
      log(3, 'watcher change: ' +fpath); 
    });

    watcher.on('unlink', function(fpath) {
      log(3, 'watcher unlink event: file deleted ' +fpath);
    });

    watcher.on('raw', function(event, fpath, details) {
      log(3, 'watcher raw: ' +event +' ' +fpath); //, details);
    });
};

// invoke main function
main(function(err) {
  if (err) {
    log(0, 'main ERROR: ' +err +' ' +err.stack);
     throw err;
  } else {
    log(1, 'main completed');
  };
});

process.on('uncaughtException', function(err) {
  if (err) log(0, 'ERROR uncaughtException:' +err +' ' +err.stack);
  //console.trace('uncaughtException: stacktrace');
  main(); // just restart it all
});

//process.exit(1); // code if there is a need to exit
