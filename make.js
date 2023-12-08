const { find } = require('geo-tz');
const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
const os = require('os');
const { fork } = require('child_process');

const precision = 2;
const decimal_size = Math.pow(10, precision);
const inc = 1 / decimal_size;
const qtd_process = Math.ceil(os.cpus().length / 2);
const lat_min = -90;
const lat_max = 90;
const long_min = -180;
const long_max = 180;
const lat_range = (lat_max - lat_min);
const long_range = (long_max - long_min);
const segs = Math.ceil(lat_range / qtd_process);
const qtd_longitudes = long_range * decimal_size;
const qtd_decpart_latitudes = decimal_size * qtd_longitudes;
const qtd_all = lat_range * qtd_decpart_latitudes;
const qtd_per_process = segs * qtd_decpart_latitudes;
const update_count = 100;
const destPath = path.join(__dirname, `from/gcs/${(precision)}-digit`);
const pad_adress = precision + 1 + 3 + 1;

/**
 *
 */
function decimal_part(x) {
  return String(Math.abs(Math.round((x % 1) * decimal_size))).padStart(precision, "0");
}

/**
 *
 * @param {*} spath
 */
function write(spath, ctt) {
  const dir = path.dirname(spath);
  fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${path}`, ctt, 'ascii');
}

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

  for (var _lat = fromto; _lat <= lat_range; _lat += qtd_process) {
    if ((_lat < lat_min) || (_lat > lat_max)) {
      return;
    }

    for (var lt = parseFloat(_lat); lt < (_lat + 1); lt += inc) {
      let ltpath = String(Math.trunc(Math.abs(lt))) + "/" + decimal_part(lt);
      let ltsignal = lt >= 0 ? "" : "-";
      let _dir = `${destPath}/lat/${ltsignal}${ltpath}`;

      try {
        for (var lg = parseFloat(long_min); lg <= long_range; lg += inc) {
          if ((lg < long_min) || (lg > long_max)) {
            break;
          }

          let zone = (find(lt, lg) + "").trim();

          let lgpath = [
            String(Math.abs(Math.trunc(lg))),
            decimal_part(lg)
          ];

          let lgsignal = lg >= 0 ? "" : "-";

          const __dir = `${_dir}/long/${lgsignal}${lgpath[0]}`;

          write(`${__dir}/${lgpath[1]}.json`, JSON.stringify({ tz: `${zone}` }, null, 0));
          write(`${__dir}/${lgpath[1]}.txt`, `${zone}`);

          last_items[`${ltsignal}${ltpath}`] = last_items[`${ltsignal}${ltpath}`] ? last_items[`${ltsignal}${ltpath}`] : {};
          last_items[`${ltsignal}${ltpath}`][`${lgsignal}${lgpath[0]}${lgpath[1]}`] = `${zone}`;

          process.send({ id: id, lat: parseFloat(lt).toFixed(2), long: parseFloat(lg).toFixed(2) });
        }

        last_items = {};
        process.send({ id: id, lat: parseFloat(lt).toFixed(2), long: parseFloat(lg).toFixed(2), start: fromto, items: JSON.parse(JSON.stringify(last_items)) });
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
function is_response_from_child(msg, full) {
  full = full === true;

  return (
    (typeof msg === 'object') &&
    (msg.hasOwnProperty('id')) &&
    (
      (!full) ||
      (
        full &&
        msg.hasOwnProperty('items') &&
        (typeof msg.items === 'object')
      )
    )
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
    forceRedraw: false,
    format: '{index} | {bar} | {percentage}% | {lat}/{long} | {value}/{total}',
  }, cliProgress.Presets.shades_grey);

  (Array(qtd_process).fill('0')).forEach((e, k) => {
    var __counter = 0;
    const bar = multibar.create(segs * qtd_decpart_latitudes, 0);

    fork('make.js')
      .on('message', (msg) => {
        ((progress) => {
          if (!is_response_from_child(msg)) {
            return;
          }

          if (is_response_from_child(msg, false)) {
            __counter++;
            __total++;

            (((__counter % update_count) == 0) || ((__total % update_count) == 0)) && progress(msg, __counter);
            return;
          }

          makes = { ...makes, ...msg.items };
          progress(msg, __counter);

          if (__counter >= (segs * qtd_longitudes)) {
            bar.stop();
          }
        })((msg, val) => {
          bar.update(
            val,
            {
              lat: String(msg.lat).toLocaleString("pt-BR").padStart(pad_adress, ' '),
              long: String(msg.long).toLocaleString("pt-BR").padStart(pad_adress, ' '),
              index: String(k).padStart(3, ' ')
            }
          );

        });
      })
      .send({ start: k });
  });

  var bar_total = false;
  var intervalo;

  intervalo = setInterval(() => {
    if (!bar_total) {
      bar_total = multibar.create(qtd_all, 0);
    }

    bar_total.update(__total, { lat: "".padStart(pad_adress), long: "".padStart(pad_adress), index: ">>>" });

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