// simple test to list a remote directory

var path = require('path');
var Client = require('ssh2').Client;

var usage = 'node sftplist.js REMOTEDIR USERNAME PASSWORD KEYLOCATION HOSTNAME PORT';

if (process.argv.length < 5) {
  console.log('Usage: ' +usage);
  process.exit(process.argv.length);
};

var RD = process.argv[2] || '.'; 
var UN = process.argv[3] || '';
var PW = process.argv[4] || '';
var KY = process.argv[5] || '';
var HO = process.argv[6] || 'localhost';
var PO = process.argv[7] || 22;

var conn = new Client();

conn.on('ready', function() {
  console.log('Client :: ready');
  conn.sftp(function(err, sftp) {
    if (err) throw err;
    sftp.readdir(RD, function(err, list) {
      if (err) throw err;
      if (list.length > 0) {
        //console.dir(list);
        for(var obj in list){
    	  console.log(obj+": "+list[obj].longname);
        };
      } else {
    	  console.log('No files found');
      };

      conn.end();
    });
  });
});

// for mac https://github.com/mscdex/ssh2/issues/238
 conn.on('keyboard-interactive', function(name, instructions, instructionsLang, prompts, finish) {
   finish([PW]);
});

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

