const { find } = require('geo-tz');
const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
const os = require('os');
const { fork } = require('child_process');

const precision = 2;
const decimal_size = Math.pow(10, precision);
const inc = 1 / decimal_size;
const qtd_process = os.cpus().length / 2;
const lat_min = -90;
const lat_max = 90;
const long_min = -180;
const long_max = 180;
const lat_range = (lat_max - lat_min);
const long_range = (long_max - long_min);
const segs = lat_range / qtd_process;
const qtd_longitudes = long_range * decimal_size;
const qtd_decpart_latitudes = decimal_size * qtd_longitudes;
const qtd_all = lat_range * qtd_decpart_latitudes;
const qtd_per_process = segs * qtd_decpart_latitudes;
const update_count = 10;
const destPath = path.join(__dirname, `from/gcs/${(precision)}-digit`);

var msg_from_child = {};

/**
 *
 * @param {*} start
 * @param {*} id
 * @returns
 */
function childs(start, id) {
  start = start ? start : 0;
  const fromto = lat_min + start;
  var last_items = {};
  var __ctt = 0;

  for (var _lat = fromto; _lat <= lat_range; _lat += qtd_process) {
    if ((_lat < lat_min) || (_lat > lat_max)) {
      return;
    }

    for (var lt = _lat; lt < (_lat + 1); lt += inc) {
      let ltpath = String(Math.trunc(Math.abs(lt))) + "/" + String(Math.abs(Math.round((lt % 1)) * decimal_size)).padStart(precision, "0");
      let ltsignal = lt >= 0 ? "" : "-";
      let _dir = `${destPath}/lat/${ltsignal}${ltpath}`;

      try {
        fs.mkdirSync(_dir, { recursive: true });

        for (var lg = long_min; lg <= long_range; lg += inc) {
          if ((lg < long_min) || (lg > long_max)) {
            break;
          }

          let zone = (find(lt, lg) + "").trim();

          let lgpath = [
            String(Math.abs(Math.trunc(lg))),
            String(Math.abs(Math.round((lg % 1) * decimal_size))).padStart(precision, "0")
          ];

          let lgsignal = lg >= 0 ? "" : "-";

          const __dir = `${_dir}/long/${lgsignal}${lgpath[0]}`;

          fs.mkdirSync(__dir, { recursive: true });

          fs.writeFileSync(`${__dir}/${lgpath[1]}.json`, JSON.stringify({ tz: `${zone}` }, null, 0), 'utf8');
          fs.writeFileSync(`${__dir}/${lgpath[1]}`, `${zone}`, 'utf8');

          last_items[`${ltsignal}${ltpath}`] = last_items[`${ltsignal}${ltpath}`] ? last_items[`${ltsignal}${ltpath}`] : {};
          last_items[`${ltsignal}${ltpath}`][`${lgsignal}${lgpath[0]}${lgpath[1]}`] = `${zone}`;

          if (((++__ctt) % update_count) == 0) {
            process.send({ id: id, pos: _lat, start: fromto, items: JSON.parse(JSON.stringify(last_items)) });
            __ctt = 0;
            last_items = {};
          }
        }
      } catch (e) {
        console.error(id, e);
        return;
      }
    }
  }
}


/**
 *
 */
function is_response_from_child(msg) {
  return (
    (typeof msg === 'object') &&
    (msg.hasOwnProperty('id')) &&
    (msg.hasOwnProperty('items')) &&
    (typeof msg.items === 'object')
  );
}

/**
 *
 */
process.on('message', (msg) => {
  if (!(msg && (typeof msg === 'object') && (msg.hasOwnProperty('start')))) {
    console.error(">>> Mensagem INVALIDA.", msg);
    return;
  }

  if ((lat_min + msg.start) > lat_max) {
    console.error(`>>> Segmento '${msg.start}' FORA do range`);
    return;
  }

  childs(msg.start, msg.start);
});


/**
 *
 */
function main() {
  var __total = 0;
  var makes = {};

  console.log(qtd_longitudes.toLocaleString("pt-BR"));
  console.log(qtd_decpart_latitudes.toLocaleString("pt-BR"));
  console.log(qtd_all.toLocaleString("pt-BR"));

  console.log("");
  console.log("Inicializando.");
  console.log("");
  console.log("Precisão..............: " + precision);
  console.log("Incrementos...........: " + inc);
  console.log("Processos.............: " + qtd_process);
  console.log("Latitudes por processo: " + segs);
  console.log("QTD Longitudes........: " + qtd_longitudes.toLocaleString("pt-BR"));
  console.log("QTD decimal Latitudes.: " + qtd_decpart_latitudes.toLocaleString("pt-BR"));
  console.log("QTD por processo......: " + qtd_per_process.toLocaleString("pt-BR"));
  console.log("QTD total.............: " + qtd_all.toLocaleString("pt-BR"));
  console.log("Progress update on....: " + update_count);
  console.log("");

  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    autopadding: true,
    autopaddingChar: " ",
    emptyOnZero: true,
    forceRedraw: true,
    format: '{index} | {bar} | {percentage}% | {degress}º | {value}/{total}',
  }, cliProgress.Presets.shades_grey);

  (Array(qtd_process).fill('0')).forEach((e, k) => {
    var __counter = 0;
    const bar = multibar.create(segs * qtd_decpart_latitudes, 0);

    fork('make.js')
      .on('message', (msg) => {
        if (!is_response_from_child(msg)) {
          return;
        }

        __counter += update_count;
        __total += update_count;

        makes = { ...makes, ...msg.items };

        bar.update(__counter, { degress: String(msg.pos).padStart(3, ' '), index: String(k).padStart(3, ' ') });

        if (__counter >= (segs * qtd_longitudes)) {
          bar.stop();
        }
      })
      .send({ start: k });
  });

  var bar_total = false;
  var intervalo;

  intervalo = setInterval(() => {
    if (!bar_total) {
      bar_total = multibar.create(qtd_all, 0);
    }

    bar_total.update(__total, { degress: "   ", index: ">>>" });

    if (__total >= qtd_all) {
      bar_total.stop();
      console.log("");
      fs.writeFileSync(`${destPath}/main.json`, JSON.stringify(makes, null, 2), 'utf8');
      clearInterval(intervalo);
    }

  }, 1000);
}

/**
 *
 */
if ((process.argv.length >= 3)) {
  main();
}