var clc = require("cli-color");
const { runScript } = require('../rs');
const { getCurrentUser } = require('../utils');
const { prepareEnv } = require('./utils.os');


async function start(serviceName) {
  await prepareEnv();

  console.log(`Starting service ${serviceName}...`);

  let currentUser = await getCurrentUser();

  return runScript(`systemctl ${currentUser==='root'?'':'--user'} start ${serviceName}`)
}

module.exports = start;