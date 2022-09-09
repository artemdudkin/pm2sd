const os = require('os');
const fs = require('fs');
const { resolve } = require('path');
var clc = require("cli-color");
const { runScript } = require('./rs');
const { getCurrentUser, getServiceList, getScriptFolder, getLogFolder, getServiceFolder } = require('./utils');

async function start(fn, opt) {
  let currentUser = await getCurrentUser();

  if (!opt.user) opt.user = currentUser;

  if (currentUser !== 'root' && opt.user !== currentUser ) {
    throw new Error(`Cannot start for user '${opt.user}' from user ${currentUser}`);
  }

  let res = await getServiceList()

  if (res.indexOf(`${opt.name}.service`) !== -1) {
    throw new Error(`Service ${opt.name} already exists`);
  } else {
    if (!fs.existsSync(fn)) {
      throw new Error(`File '${fn}' does not exists`);
    }

    if (currentUser !== 'root') await runScript('mkdir -p  ~/.config/systemd/user/');
    if (currentUser !== 'root') await runScript('mkdir -p  ~/log/');
    if (currentUser !== 'root') await runScript('mkdir -p  ~/bin/');

    let scriptFolder = getScriptFolder(currentUser);
    let logFolder = getLogFolder(currentUser);
    let serviceFolder = getServiceFolder(currentUser);

    fs.writeFileSync(`${scriptFolder}${opt.name}.sh`, `#!/usr/bin/env node\n\nrequire(\'${resolve(fn)}\');\n`, {mode:0o755, flag:'w'})
    if (opt.user!=='root') await runScript(`chown ${opt.user} ${scriptFolder}${opt.name}.sh`);

    fs.writeFileSync(`${scriptFolder}${opt.name}.service.sh`, `#!/bin/bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

exec 1>>${logFolder}${opt.name}/output.log
exec 2>&1

${scriptFolder}${opt.name}.sh &
    `, {mode:0o755})
    if (opt.user!=='root') await runScript(`chown ${opt.user} ${scriptFolder}${opt.name}.service.sh`);

    if (!fs.existsSync(`${logFolder}${opt.name}`)) await runScript(`mkdir ${logFolder}${opt.name}`);
    if (opt.user!=='root') await runScript(`chown ${opt.user} ${logFolder}${opt.name}`);

    fs.writeFileSync(`${serviceFolder}${opt.name}.service`, `
[Unit]
Description=PM2SD ${opt.description || opt.name}
After=network.target

[Service]
User=${opt.user}
WorkingDirectory=${process.cwd()}
Type=forking
Restart=always
RestartSec=30
ExecStart=/bin/bash ${scriptFolder}${opt.name}.service.sh

[Install]
WantedBy=multi-user.target
    `, {mode:0o644})

    await runScript(`systemctl ${currentUser==='root'?'':'--user'} daemon-reload`)
    await runScript(`systemctl ${currentUser==='root'?'':'--user'} start ${opt.name}`)
    await runScript(`systemctl ${currentUser==='root'?'':'--user'} enable ${opt.name}`)
  }
}

module.exports = start;