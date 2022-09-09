# pm2sd
PM2SD is a process manager for Node.js applications built over `systemd`. It is inspired by PM2, but not that complex and uses far less memory (i.e. zero memory as it is wrapper for systemd service). I love PM2, but cannot use it on small VPS for pet projects, so meet the PM2SD!

You can start process as simple as

```bash
$ pm2sd start index.js
```

Process will be started as linux service (i.e. added to /etc/systemd/system), enabled for restart after reboot, will restart in 30 seconds if it crashes, output and error logs goes to `/var/log/pm2sd-<name>` (yes, start demands `sudo` right now, but service can be started from any user). No clusters, no load balancers, just one living process.

Implemented commands: ls, start, stop, restart, delete.

Works on Linux (and Windows in plans).

## ls

Lists all pm2sd services. Also, you can get list of all system services with option `--all`:

```bash
$ pm2sd ls --all
```

<img width=600px src="https://raw.githubusercontent.com/artemdudkin/pm2sd/main/doc/ls.png" alt="ls output">

## start

Starts new process. Avaliable options: name, description, user (i.e. can be started from any user). 

```bash
$ pm2sd start index.js --name=test-server
```
Tested only for nvm-installed node, on CentOS and Ubuntu.

## stop

Stops process (by its name).

## restart

Restarts process (by its name).

## delete

Delete all traces of process (include logs).
