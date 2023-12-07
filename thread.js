const { find } = require('geo-tz');
const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
const {
  Worker, isMainThread, parentPort, workerData,
} = require('node:worker_threads');

const precision = 2;
const decimals = Math.pow(10, precision);
const inc = 1 / decimals;
const min = -90;
const max = 90;

var loop = 0;

console.log("Inicializando.");

const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
console.log("Total: " + Math.pow(decimals * (max - min), precision));
console.log("Incrementos: " + inc);
const app = express();

bar1.start(Math.pow(decimals * (max - min), precision), 0);


// min * (1 / inc)
// to max * (1 / inc)
function run(from, to) {
  for (var lat = from; lat <= to; lat += inc) {
    let lt = Math.round((lat / (1 / inc)) * decimals) / decimals;
    let ltpath = String(Math.trunc(Math.abs(lt))).padStart(precision, '0') + "/" + String(Math.abs(Math.round((lt % 1)) * decimals)).padStart(precision, '0');
    let ltsignal = lt >= 0 ? "+" : "-";
    let _dir = path.join(__dirname, `from/coordinate/4-digit/latitude/${ltsignal}/${ltpath}`);

    try {
      fs.mkdirSync(_dir, { recursive: true });

      for (var long = min * (1 / inc); long <= max * (1 / inc); long += inc) {
        let lg = Math.round((long / (1 / inc)) * decimals) / decimals;
        let lgpath = [
          String(Math.abs(Math.trunc(lg))).padStart(precision, '0'),
          String(Math.abs(Math.round((lg % 1) * decimals))).padStart(precision, '0')
        ];
        let zone = find(lt, lg);
        let lgsignal = lg >= 0 ? "+" : "-";

        const __dir = `${_dir}/longitude/${lgsignal}/${lgpath[0]}`;

        fs.mkdirSync(__dir, { recursive: true });

        fs.writeFileSync(`${__dir}/${lgpath[1]}.json`, JSON.stringify({ timezone: `${zone}` }, null, 2), 'utf8');
        fs.writeFileSync(`${__dir}/${lgpath[1]}.text`, `${zone}`, 'utf8');

        ++__counter;
      }
    } catch (e) {
      console.log(e);
      return;
    }
  }
}

