const fs = require('fs');
const { resolve } = require('path');
var clc = require("cli-color");
const { runScript } = require('../rs');
const { getCurrentUser } = require('../utils');
const { getScriptFolder, getLogFolder, getServiceFolder, prepareEnv } = require('./utils.os');
const cmd_stop = require('./cmd_stop');

async function start(serviceName) {
  await prepareEnv();
  let currentUser = await getCurrentUser();

  let scriptFolder = getScriptFolder(currentUser);
  let logFolder = getLogFolder(currentUser);
  let serviceFolder = getServiceFolder(currentUser);

  await cmd_stop(serviceName, true);

  await runScript(`rm -rf ${scriptFolder}${serviceName}.sh`);

  await runScript(`rm -rf ${scriptFolder}${serviceName}.service.sh`);

//do not delete logs
//  await runScript(`rm -rf ${logFolder}${serviceName}`);

  await runScript(`rm -rf ${serviceFolder}${serviceName}.service`);

  await runScript(`systemctl ${currentUser==='root'?'':'--user'} daemon-reload`)
}

module.exports = start;