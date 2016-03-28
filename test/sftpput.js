// simple test for sftp put local file
var path = require('path');
var Client = require('ssh2').Client;

var usage = 'node sftpput.js LOCALFILE REMOTEDIR USERNAME PASSWORD KEYLOCATION HOSTNAME PORT';

if (process.argv.length < 5) {
  console.log('Usage: ' +usage);
  process.exit(process.argv.length);
};

var LF = process.argv[2] || process.argv[1]; // sind this file if arg 2 is null
var RD = process.argv[3] || '.'; 
var UN = process.argv[4] || '';
var PW = process.argv[5] || '';
var KY = process.argv[6] || '';
var HO = process.argv[7] || 'localhost';
var PO = process.argv[8] || 22;

var BN = path.basename(LF);

var conn = new Client();

conn.on('ready', function() {
  console.log('Client :: ready');
  conn.sftp(function(err, sftp) {
    if (err) throw err;
    isDir(RD, sftp, function(err) {
      if (err) {
        console.log('sftp ERROR: ' +RD +' is not a directory ' +err);
        throw err;
      };
    });

    sftp.fastPut(LF, RD+BN, function(err) {
      console.log('fastPut: ' +LF +' ' +RD+BN);
      if (err) {
	if (err.message === 'No such file or directory')
          console.log('fastPut: ERROR ' +err.message);
	throw err;
      };
      console.log('fastPut successful: ' +LF +' ' +RD+BN);
      conn.end();
    });
  });
})

// for mac https://github.com/mscdex/ssh2/issues/238
conn.on('keyboard-interactive', function(name, instructions, instructionsLang, prompts, finish) {
  finish([PW]);
});

var isDir = function(path, stream, cb) {
  console.log('isDir sftp entry: ' +path);
  var rc = stream.opendir(path, function(err) {
    if (err) {
      return cb(err);
    } else {
      console.log('isdir sftp rc: ' +rc +' '+path);
      return cb ('');
    };
  });
};


conn.connect({
  host: HO,
  port: PO,
  username: UN, 
  password: PW,
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
  privateKey: KY ? require('fs').readFileSync(KY) : ''
});

