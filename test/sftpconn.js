// sftp connect test

var usage = 'node sftpconn.js USERNAME PASSWORD KEYLOCATION HOSTNAME PORT';

if (process.argv.length < 4) {
  console.log('Usage: ' +usage);
  process.exit(process.argv.length);
};

var UN = process.argv[2] || '';		 	// username
var PW = process.argv[3] || '';		 	// password
var KY = process.argv[4] || ''; 		// ley location
var HO = process.argv[5] || 'localhost';	// hostname
var PO = process.argv[6] || 22;	        	// port
var DE = process.argv[7] || false;		// debugging

var Client = require('ssh2').Client;

var conn = new Client();
conn.on('ready', function() {
  console.log('Client :: ready');
  console.log('Yay! Exiting');
  process.exit();
}).connect({
  host: HO,
  port: PO,
  username: UN,
  password: PW,
  debug: sftpDebug,
  algorithms: {
	kex: ['diffie-hellman-group1-sha1',
	  'ecdh-sha2-nistp256',
	  'ecdh-sha2-nistp384',
	  'ecdh-sha2-nistp521',
	  'diffie-hellman-group-exchange-sha256',
	  'diffie-hellman-group14-sha1'],
	cipher: ['aes128-cbc','3des-cbc',
	  'blowfish-cbc',
	  'aes128-ctr',
	  'aes192-ctr',
	  'aes256-ctr',
	  'aes128-gcm',
	  'aes128-gcm@openssh.com',
	  'aes256-gcm',
	  'aes256-gcm@openssh.com'],
  },
  tryKeyboard: true,
  privateKey: KY ? require('fs').readFileSync(KY) : ''
});

// for mac https://github.com/mscdex/ssh2/issues/238
conn.on('keyboard-interactive', function(name, instructions, instructionsLang, prompts, finish) {
  finish([PW]);
});

conn.on('error', function(err) {
  if (err) console.log ('Client error: ' +err);
});

// for debugging sftp interactions
function sftpDebug(str) {
  if (DE !== false) 
    console.log('sftpDebug: ' +str);
};

