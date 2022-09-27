# pm2sd
PM2SD is a process manager for Node.js applications (or other scripts) built over `systemd`. It is inspired by PM2, but not that complex and uses far less memory (i.e. zero memory as it is wrapper for systemd service). I love PM2, but cannot use it on small VPS for pet projects, so meet the PM2SD!

You can start process as simple as

```bash
$ pm2sd start index.js
```

Process will be started as linux system service (i.e. added to /etc/systemd/system), enabled for restart after reboot, will restart in 30 seconds if it crashes, output and error logs goes to `/var/log/pm2sd-<name>` (if you want configure and start service under non-privileged user, you need to do some [black magic](./doc/d-bus-black-magic.md)). 

**No clusters, no load balancers, no watching, just one living process.**

Implemented commands: ls, start, stop, restart, delete, log.

Works on Linux (tested on Ubuntu, CentOS) and Windows in plans :construction: :hammer:.

## ls

Lists all pm2sd services. Also, you can get list of all system services with option `--all`:

```bash
$ pm2sd ls --all
```

<img width=600px src="https://raw.githubusercontent.com/artemdudkin/pm2sd/main/doc/ls.png" alt="ls output">

Also you can filter list of all services by part of its name with `pm2sd ls <name>`

## start

Starts new process. Avaliable options: name, description, time, user (i.e. service can be started from any user). 
`--time` adds timestamp to logs.

```bash
$ pm2sd start index.js --name=test --user=node
```

## stop

Stops process (by its name).

## restart

Restarts process (by its name).

## delete

Delete all traces of process (include logs).

## log

Tails log of selected process (`pm2sd log <name>`) or logs for all processes if nothing specified (`pm2sd log`).
