var clc = require("cli-color");
const { runScript } = require('./rs');

async function restart(serviceName) {
      console.log(`Starting service ${serviceName}...`);

      try {
        await runScript(`systemctl stop ${serviceName}`)
      } catch (e) {}

      try {
        await runScript(`systemctl start ${serviceName}`)
      } catch(res) {
        console.log('\n' + clc.red( res.lines.join('').split('\n')[0]) + '\n');
      }
}

module.exports = restart;