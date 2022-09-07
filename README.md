# pm2sd
PM2SD is a process manager for Node.js applications built over systemd. It is inspired by PM2, but not that complex and uses far less memory. I love PM2, but cannot use it on small VPS for pet projects, so meet the PM2SD!

Only command implemented right now is **ls** that shows all services from /etc/systemd/system folder like `pm2 ls` do:

```bash
$ pm2sd ls --all
```

<img width=600px src="https://raw.githubusercontent.com/artemdudkin/pm2sd/main/doc/ls.png" alt="ls output">
