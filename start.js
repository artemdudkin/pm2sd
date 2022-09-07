const fs = require('fs');
const { resolve } = require('path');
var clc = require("cli-color");
const { runScript } = require('./rs');
const { getServiceList } = require('./ls');

function random(min,max) {
    return Math.floor((Math.random())*(max-min+1))+min;
}

async function start(fn, opt) {
  if (!opt.name) opt.name = 's' + random(10000, 99999)

  let res = await getServiceList(opt.name)

  if (res.length > 0) {
    throw new Error(`Service ${opt.name} already exists`);
  } else {
    fs.writeFileSync(`/usr/sbin/${opt.name}.sh`, `#!/usr/bin/env node\n\nrequire(\'${resolve(fn)}\');\n`, {mode:0o755})
    if (opt.user && opt.user!=='root') await runScript(`chown ${opt.user} /usr/sbin/${opt.name}.sh`);

    fs.writeFileSync(`/usr/sbin/${opt.name}.service.sh`, `#!/bin/bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

/usr/sbin/${opt.name}.sh > /var/log/${opt.name}/output.log 2>&1 &
    `, {mode:0o755})
    if (opt.user && opt.user!=='root') await runScript(`chown ${opt.user} /usr/sbin/${opt.name}.service.sh`);

    if (!fs.existsSync(`/var/log/${opt.name}`)) await runScript(`mkdir /var/log/${opt.name}`);
    if (opt.user && opt.user!=='root') await runScript(`chown ${opt.user} /var/log/${opt.name}`);

    fs.writeFileSync(`/etc/systemd/system/${opt.name}.service`, `
[Unit]
Description=PM2SD ${opt.description || opt.name}
After=network.target

[Service]
User=${opt.user || 'root'}
WorkingDirectory=${process.cwd()}
Type=forking
Restart=always
RestartSec=30
ExecStart=/bin/bash /usr/sbin/${opt.name}.service.sh

[Install]
WantedBy=multi-user.target
    `, {mode:0o644})

    await runScript(`systemctl daemon-reload`)
    await runScript(`systemctl start ${opt.name}`)
    await runScript(`systemctl enable ${opt.name}`)
  }
}

module.exports = start;