const fs = require('fs');
const { resolve } = require('path');
var clc = require("cli-color");
const { runScript } = require('./rs');
const { getServiceList } = require('./ls');

async function start(serviceName) {
  try {
    await runScript(`systemctl stop ${serviceName}`);
  } catch (e) {}

  await runScript(`rm -rf /usr/sbin/${serviceName}.sh`);

  await runScript(`rm -rf /usr/sbin/${serviceName}.service.sh`);

  await runScript(`rm -rf /var/log/${serviceName}`);

  await runScript(`rm -rf /etc/systemd/system/${serviceName}.service`);

  await runScript(`systemctl daemon-reload`)
}

module.exports = start;