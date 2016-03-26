// simple test for sftp put local file
var path = require('path');
var Client = require('ssh2').Client;

var usage = 'node sftpput.js index.js "." USERNAME PASSWORD KEYLOCATION HOSTNAME PORT';

if (process.argv.length < 7) {
  console.log('Usage: ' +usage);
  process.exit(process.argv.length);
};

var LF = process.argv[2] || process.argv[1];
var RD = process.argv[3] || '.'; 
var UN = process.argv[4] || '';
var PW = process.argv[5] || '';
var KY = process.argv[6] || '';
var HO = process.argv[7] || 'localhost';
var PO = process.argv[8] || 7522;

var BN = path.basename(LF);

var conn = new Client();

conn.on('ready', function() {
  console.log('Client :: ready');
  conn.sftp(function(err, sftp) {
    if (err) throw err;
    sftp.fastPut(LF, RD+BN, function(err) {
      console.log('fastPut successful: ' +LF);
      if (err) throw err;
      conn.end();
    });
  });
})

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
  privateKey: KY ? require('fs').readFileSync(KY) : ''
});

