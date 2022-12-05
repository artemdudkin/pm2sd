var clc = require("cli-color");
const { runScript } = require('./rs');
const { getCurrentUser } = require('./utils');


async function stop(serviceName, isSilent) {
  if (!isSilent) console.log(`Stoping service ${serviceName}...`);

  let currentUser = await getCurrentUser();

  return runScript(`systemctl ${currentUser==='root'?'':'--user'} stop ${serviceName}`)
}

module.exports = stop;