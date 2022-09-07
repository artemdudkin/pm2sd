var clc = require("cli-color");
const { runScript } = require('./rs');

function stop(serviceName) {
  return runScript(`systemctl stop ${serviceName}`)
    .catch( res => {
      console.log('\n' + clc.red( res.lines.join('').split('\n')[0]) + '\n');
    })
}

module.exports = stop;