var clc = require("cli-color");
const { runScript } = require('./rs');
const { getCurrentUser } = require('./utils');


async function start(serviceName) {
  console.log(`Starting service ${serviceName}...`);

  let currentUser = await getCurrentUser();

  return runScript(`systemctl ${currentUser==='root'?'':'--user'} start ${serviceName}`)
}

module.exports = start;