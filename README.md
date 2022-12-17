# pm2sd
PM2SD is a process manager for Node.js applications (or other scripts) built over system services. It is inspired by PM2, but not that complex and uses far less memory (i.e. zero memory as it is wrapper for systemd service at Linux, for instance). I love PM2, but cannot use it on small VPS for pet projects, so meet the PM2SD!

You can start process as simple as

```bash
$ pm2sd start index.js
```

Process will be started as system service (i.e. added to /etc/systemd/system at Linux), enabled for restart after reboot, will restart in 30 seconds if it crashes, output and error logs goes to `/var/log/pm2sd-<name>` (if you want configure and start service under non-privileged user, you need to do some [magic](./doc/d-bus-black-magic.md)). 

**No clusters, no load balancers, no watching, just one living process.**

It works on Linux, and Windows is in the plans :construction: :hammer:.

## Commands

Implemented commands: ls, start, stop, restart, delete, log.

### ls

Lists all pm2sd services. Also, you can get list of all system services with option `--all`:

```bash
$ pm2sd ls --all
```
<img width=600px src="https://raw.githubusercontent.com/artemdudkin/pm2sd/main/doc/ls.png" alt="ls output">

You can filter list of all services by part of its name with `pm2sd ls <name>`.

Also you can use `--json` option to get json instead of colored text output.

### start

Starts new process. Avaliable options: name, description, time, user (i.e. service can be started from any user). 
`--time` adds timestamp to logs.

```bash
$ pm2sd start index.js --name=test --user=node --time
```

### stop

Stops process (by its name).

### restart

Restarts process (by its name).

### delete

Delete all traces of process (include logs).

### log

Tails log of selected process (`pm2sd log <name>`) or logs for all processes if nothing specified (`pm2sd log`).

## Troubleshooting

If you've got `Failed to connect to D-Bus` that means you're trying to work under non-root user, which requires the systemd user service to be started (look at [this](./doc/d-bus-black-magic.md)). Or you switched to user by `su <user>` instead of ssh login.
