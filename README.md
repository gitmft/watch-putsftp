Description
===========

watch-putsfp is a smart JavaScript [node.js](http://nodejs.org/) sftp client CLI that listens for changes on local folders then uploads the file to an sFTP server. 

It uses the node packages[chokidar](https://github.com/paulmillr/chokidar) and [ssh2](https://github.com/mscdex/ssh2) for file watching and sFTP file delivery respectively.


Requirements
============

* [node.js](http://nodejs.org/) -- v0.10 or newer

Install
=======

    npm install watch-putsftp


Features
===============

* Auto retry if server goes down
* Configurable watcher, polling, filters
* Configurable sFTP client: password or keys, keep alive
* Flexible CLI arguments utilizing [yargs](https://www.npmjs.com/package/yargs)
* Upload status with -s flag
* sftp DEBUG option with -v 5 flag
* Auto rename on server using .partial suffix

Client Examples
===============

* Display help and command line options 

```
mode .
Usage: node index.js -putsftp.js: -u <SFTP_USER> -a <SFTP_PASSWORD> -k
<SFTP_KEY> -h <SFTP_HOST> -p <SFTP_PORT> -r <SFTP_FOLDER> -l <WATCH_FOLDER>  -v
<0-5> -s false

Options:
  -u, --user      Username for the remote SFTP Server.
  -a, --password  Password for the remote SFTP Server.
  -k, --key       SSH Key location for the remote SFTP Server.
  -h, --host      Host name or IP for the remote SFTP Server.         [required]
  -p, --port      Port for the remote SFTP Server.      [number] [default: 7522]
  -r, --remote    Remote folder where files are put for upload
  -v, --verbose   1-5 LOW to HIGH. Sends log items to the STDOUT console for
                  debugging purposes                       [number] [default: 1]
  -l, --local     Local watch folder where files are placed for upload[required]
  -s, --status    Provides updates on file upload status
                                                      [boolean] [default: false]
Examples:
  node watch-putsftp.js -u weblogic -a
  MyPassword -k /tmp/sftpkey -h localhost
  -p 7522 -r /uploads -l /tmp/mft/watch/
  -r /uploads/ -v 1 -s false
```

* Listen on Disk WatchDisk and publish to localhost sFTP server with minimal auditing

```
bash-3.2$ node index.js -u clarkkent -k sftpkey -h localhost -r /uploads -l /Volumes/WatchDisk/ -r /clarkkent/uploads/
2016-03-25T21:48:35.976Z: Connecting to sFTP Server
2016-03-25T21:48:37.747Z: sftp: ready
2016-03-25T21:48:37.813Z: watcher ready: 
2016-03-25T21:49:14.953Z: upload sftp successful /Volumes/WatchDisk/package.json /clarkkent/uploads/package.json
```


* Automatic error handling and retry when server goes down and comes back up

```
bash-3.2$ node index.js -u clarkkent -k sftpkey -h localhost -r /uploads -l /Volumes/WatchDisk/ -r /clarkkent/uploads/
2016-03-25T21:48:35.976Z: Connecting to sFTP Server
2016-03-25T21:48:37.747Z: sftp: ready
2016-03-25T21:48:37.813Z: watcher ready: 
2016-03-25T21:49:14.953Z: upload sftp successful /Volumes/WatchDisk/package.json /clarkkent/uploads/package.json
2016-03-25T21:51:05.173Z: SSH Client ERROR: Error: read ETIMEDOUT
2016-03-25T21:51:05.173Z: sFTP conn ERROR:ETIMEDOUT
2016-03-25T21:51:05.173Z: Pausing before reconnect 30 seconds 1
2016-03-25T21:51:05.174Z: sftp: close: 
2016-03-25T21:51:05.178Z: upload sftp invoke ERROR: /Volumes/WatchDisk/package.json Error: No response from server
2016-03-25T21:51:05.179Z: watcher upload ERROR: Error: No response from server
2016-03-25T21:51:36.487Z: sftp: ready
2016-03-25T21:51:36.500Z: watcher ready: 
2016-03-25T21:51:37.781Z: upload sftp successful /Volumes/WatchDisk/package.json /clarkkent/uploads/package.json
```

* More verbose output with -v 3 flag

```
bash-3.2$ node index.js -u clarkkent -k sftpkey -h localhost -r /uploads -l /Volumes/WatchDisk/ -r /clarkkent/uploads/ -v 3
2016-03-25T22:01:50.918Z: Connecting to sFTP Server
2016-03-25T22:01:52.145Z: sftp: ready
2016-03-25T22:01:52.147Z: startWatching watcher init
2016-03-25T22:01:52.158Z: watcher addDir: /Volumes/WatchDisk/
2016-03-25T22:01:52.215Z: watcher ready: 
2016-03-25T22:02:01.171Z: watcher raw: change /Volumes/WatchDisk
2016-03-25T22:02:01.280Z: watcher raw: change /Volumes/WatchDisk/package.json
2016-03-25T22:02:03.200Z: watcher add file: /Volumes/WatchDisk/package.json
2016-03-25T22:02:03.201Z: upload entry: /Volumes/WatchDisk/package.json /clarkkent/uploads/ package.json package.json.partial
2016-03-25T22:02:03.501Z: upload sftp get stream resp:true
2016-03-25T22:02:03.964Z: upload sftp.fastPut: /Volumes/WatchDisk/package.json package.json.partial
2016-03-25T22:02:03.964Z: rename sftp entry: /clarkkent/uploads/package.json.partial /clarkkent/uploads/package.json
2016-03-25T22:02:03.964Z: unlink sftp entry: /clarkkent/uploads/package.json
2016-03-25T22:02:04.066Z: unlink sftp callback : /clarkkent/uploads/package.json
2016-03-25T22:02:04.067Z: unlink/delete file sftp successful rc: true /clarkkent/uploads/package.json
2016-03-25T22:02:04.067Z: rename unlink sftp successful: /clarkkent/uploads/package.json
2016-03-25T22:02:04.085Z: rename sftp callback : /clarkkent/uploads/package.json.partial /clarkkent/uploads/package.json
2016-03-25T22:02:04.086Z: rename sftp rc: true /clarkkent/uploads/package.json.partial /clarkkent/uploads/package.json
2016-03-25T22:02:04.087Z: upload sftp rename successful /clarkkent/uploads/package.json.partial /clarkkent/uploads/package.json
2016-03-25T22:02:04.087Z: upload sftp successful /Volumes/WatchDisk/package.json /clarkkent/uploads/package.json
2016-03-25T22:02:04.104Z: watcher raw: change /Volumes/WatchDisk/package.json
2016-03-25T22:02:04.177Z: watcher raw: change /Volumes/WatchDisk
2016-03-25T22:02:04.207Z: watcher unlink event: file deleted /Volumes/WatchDisk/package.json
```

* Even more verbose output including SFTP DEBUG with -v 5 flag

```
bash-3.2$ node index.js -u clarkkent -k sftpkey -h localhost -r /uploads -l /Volumes/WatchDisk/ -r /clarkkent/uploads/ -v 5
2016-03-25T22:17:03.904Z: Connecting to sFTP Server
2016-03-25T22:17:03.929Z: sftpDebug: DEBUG: Local ident: 'SSH-2.0-ssh2js0.1.0'
2016-03-25T22:17:03.935Z: sftpDebug: DEBUG: Client: Trying 127.0.0.1 on port 22 ...
2016-03-25T22:17:04.033Z: sftpDebug: DEBUG: Client: Connected
2016-03-25T22:17:04.122Z: sftpDebug: DEBUG: Parser: IN_INIT
2016-03-25T22:17:04.125Z: sftpDebug: DEBUG: Parser: IN_GREETING
2016-03-25T22:17:04.126Z: sftpDebug: DEBUG: Parser: IN_HEADER
2016-03-25T22:17:04.127Z: sftpDebug: DEBUG: Remote ident: 'SSH-2.0-SSHD-CORE-0.6.0'
2016-03-25T22:17:04.130Z: sftpDebug: DEBUG: Outgoing: Writing KEXINIT
2016-03-25T22:17:04.133Z: sftpDebug: DEBUG: Parser: IN_PACKETBEFORE (expecting 8)
2016-03-25T22:17:04.133Z: sftpDebug: DEBUG: Parser: IN_PACKET
2016-03-25T22:17:04.134Z: sftpDebug: DEBUG: Parser: pktLen:268,padLen:14,remainLen:264
2016-03-25T22:17:04.134Z: sftpDebug: DEBUG: Parser: IN_PACKETDATA
2016-03-25T22:17:04.134Z: sftpDebug: DEBUG: Parser: IN_PACKETDATAAFTER, packet: KEXINIT
2016-03-25T22:17:04.140Z: sftpDebug: DEBUG: Comparing KEXINITs ...
...
```

* File upload progress with -s flag

```
bash-3.2$ node index.js -u clarkkent -k sftpkey -h localhost -r /uploads -l /Volumes/WatchDisk/ -r /clarkkent/uploads/ -s
2016-03-25T22:21:11.128Z: Connecting to sFTP Server
2016-03-25T22:21:12.444Z: sftp: ready
2016-03-25T22:21:12.510Z: watcher ready: 
2016-03-25T22:21:19.589Z: Progress: /clarkkent/uploads/watch-putsftp.pdf.partial TotalTx:32768 Chunk:32768 Total:1363635
2016-03-25T22:21:19.680Z: Progress: /clarkkent/uploads/watch-putsftp.pdf.partial TotalTx:65536 Chunk:32768 Total:1363635
2016-03-25T22:21:19.780Z: Progress: /clarkkent/uploads/watch-putsftp.pdf.partial TotalTx:98304 Chunk:32768 Total:1363635
2016-03-25T22:21:19.858Z: Progress: /clarkkent/uploads/watch-putsftp.pdf.partial TotalTx:131072 Chunk:32768 Total:1363635
2016-03-25T22:21:19.875Z: Progress: /clarkkent/uploads/watch-putsftp.pdf.partial TotalTx:163840 Chunk:32768 Total:1363635

Tests
===

* CLI tests in test folder
** test/sftpconn.js to test sftp connectivity
** test/sftplist.js to test file list
** test/sftpput.js to test file put

```
bash-3.2$ node test/sftpconn.js 
Usage: node sftpconn.js USERNAME PASSWORD KEYLOCATION HOSTNAME PORT
bash-3.2$ node test/sftplist.js 
Usage: node sftplist.js "." USERNAME PASSWORD KEYLOCATION HOSTNAME PORT
bash-3.2$ node test/sftpput.js 
Usage: node sftpput.js index.js "." USERNAME PASSWORD KEYLOCATION HOSTNAME PORT
bash-3.2$ 
```

TODO
===

* Propogate subfolders to server
* Notification via email and/or [node-notifier] (https://www.npmjs.com/package/node-notifier)
* other?

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## History

Created: May 6, 2015

## Credits

Dave Berry A.K.A (bigfiles)

## License

ISC

