const os = require('os');
const fs = require('fs');
const { resolve } = require('path');
var clc = require("cli-color");
const { runScript } = require('../rs');
const { getCurrentUser } = require('../utils');
const { getServiceList, getScriptFolder, getLogFolder, getServiceFolder } = require('./utils.os');

/**
 * @param {String} fn
 * @param {Object} opt {name, user, description, time}
 */
async function create(fn, opt) {
  let currentUser = await getCurrentUser();

  if (!opt.user) opt.user = currentUser;

  if (currentUser !== 'root' && opt.user !== currentUser ) {
    throw new Error(`Cannot start for different user from non-root user`);
  }

  let res = await getServiceList()

  if (res.indexOf(`${opt.name}.service`) !== -1) {
    throw new Error(`Service ${opt.name} already exists`);
  } else {
    if ((fn.endsWith('.js') || fn.endsWith('.sh')) && !fs.existsSync(fn)) {
      throw new Error(`File '${fn}' does not exists`);
    }

    //create folders if needed
    if (currentUser !== 'root') await runScript('mkdir -p  ~/.config/systemd/user/');
    if (currentUser !== 'root') await runScript('mkdir -p  ~/log/');
    if (currentUser !== 'root') await runScript('mkdir -p  ~/bin/');

    let scriptFolder = getScriptFolder(currentUser);
    let logFolder = getLogFolder(currentUser);
    let serviceFolder = getServiceFolder(currentUser);

    //create script to start process ('#!/usr/bin/env node' for node.j spplications and '#!/bin/bash' for others)
    if (fn.endsWith('.js')) {
      fs.writeFileSync(`${scriptFolder}${opt.name}.sh`, `#!/usr/bin/env node\n\nrequire(\'${resolve(fn)}\');\n`, {mode:0o755, flag:'w'})
    } else if (fn.endsWith('.sh')) {
      fs.copyFileSync(fn, `${scriptFolder}${opt.name}.sh`)
    } else {
      fs.writeFileSync(`${scriptFolder}${opt.name}.sh`, `#!/bin/bash\n\n${fn}\n`, {mode:0o755, flag:'w'})
    }
    if (opt.user!=='root') await runScript(`chown ${opt.user} ${scriptFolder}${opt.name}.sh`);

    //create script to start process from service (which uses previous script and adds paths and timestamp if needed)
    fs.writeFileSync(`${scriptFolder}${opt.name}.service.sh`, `#!/bin/bash

${fn.endsWith('.js') ? 
`# env for nvm-based node
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion`
:''
}

${scriptFolder}${opt.name}.sh ${opt.time? `2>&1 | while IFS= read -r line; do printf \'%s %s\n\' "$(date +\'%Y-%m-%d %T %z\')" "$line"; done | tee -a ${logFolder}${opt.name}/output.log > /dev/null` : `>>${logFolder}${opt.name}/output.log 2>&1`} &

    `, {mode:0o755})
    if (opt.user!=='root') await runScript(`chown ${opt.user} ${scriptFolder}${opt.name}.service.sh`);

    //create folder for logs if needed
    if (!fs.existsSync(`${logFolder}${opt.name}`)) await runScript(`mkdir ${logFolder}${opt.name}`);
    if (opt.user!=='root') await runScript(`chown ${opt.user} ${logFolder}${opt.name}`);

    //create script to start service (which uses previous script)
    fs.writeFileSync(`${serviceFolder}${opt.name}.service`, `
[Unit]
Description=PM2SD ${opt.description || opt.name}
After=network.target

[Service]
${currentUser==='root'?`User=${opt.user}`:''}
WorkingDirectory=${process.cwd()}
Type=forking
Restart=always
RestartSec=30
ExecStart=/bin/bash ${scriptFolder}${opt.name}.service.sh

[Install]
WantedBy=${currentUser==='root'?'multi-user.target':'default.target'}
    `, {mode:0o644})


    //start and enable service
    await runScript(`systemctl ${currentUser==='root'?'':'--user'} daemon-reload`)
    await runScript(`systemctl ${currentUser==='root'?'':'--user'} start ${opt.name}`)
    await runScript(`systemctl ${currentUser==='root'?'':'--user'} enable ${opt.name}`)

    //add logrotate
    let config = `{
      daily
      rotate 15
      compress
      minsize 1M
      noolddir
      dateext

      missingok
      copytruncate
      notifempty
}\n`;
    if (!fs.existsSync('/etc/logrotate.d')) {
      console.log(clc.yellowBright('\nCannot find logrotate config. Please install logrotate.\n'));
    } else {
      if (currentUser==='root') {
        if (!fs.existsSync('/etc/logrotate.d/pm2sd')) {
          fs.writeFileSync('/etc/logrotate.d/pm2sd', `/var/log/pm2sd-*/*.log\n${config}`);
        }
      } else {
        if (!fs.existsSync(`${os.homedir()}/.pm2sd-logrotate.conf`)) {
          fs.writeFileSync(`${os.homedir()}/.pm2sd-logrotate.conf`, `~/log/pm2sd-*/*.log\n${config}`);
          fs.writeFileSync(`${os.homedir()}/.pm2sd-logrotate-state`, '');
          await runScript('(crontab -l; echo "1 * * * * /usr/sbin/logrotate -s ~/.pm2sd-logrotate-state ~/.pm2sd-logrotate.conf")|awk \'!x[$0]++\'|crontab -');
        }
      }
    }
  }
}

module.exports = create;