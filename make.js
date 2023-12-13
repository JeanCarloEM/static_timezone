
const path = require('path');
const cliProgress = require('cli-progress');
const os = require('os');
const { fork } = require('child_process');
const colors = require('ansi-colors');
const startedTime = Date.now();
const { getCMDParam, has } = require("commom.js");
const { mergeDeep } = require('./maker/commom.js');

const options = {
  precision: getCMDParam('p', 'precision', 2)
  , update_count: getCMDParam('u', 'update', 100)
  , isFreezeSeconds: getCMDParam('u', 'update', 20)
  , root: getCMDParam('r', 'root', 'from').trim().replace(/["']/g, "").trim()

  , save_json: getCMDParam('j', 'save-json', false)
  , save_merged_json: getCMDParam('f', 'save-full-json', false)
  , save_raw: getCMDParam('s', 'save-raw', true)
  , qtd_process: getCMDParam('t', 'threads', Math.ceil(os.cpus().length))
  , inc_multiply: getCMDParam('m', 'multiply', 1)

  , decimal_lt_size: Math.pow(10, precision)
  , decimal_lg_size: Math.pow(10, precision)
  , lat_min: -58
  , lat_max: 84
  , long_min: -180
  , long_max: 180
  , lat_range: (lat_max - lat_min)
  , long_range: (long_max - long_min)
  , segs: Math.ceil(lat_range / qtd_process)
  , qtd_longitudes: long_range * decimal_size
  , qtd_decpart_latitudes: decimal_size * qtd_longitudes
  , qtd_all: lat_range * qtd_decpart_latitudes
  , qtd_per_process: segs * qtd_decpart_latitudes
  , destPath: path.join(`${root}/gcs/${(precision)}-digit`)
  , pad_adress: 1 + 3 + 1 + precision
  , ignores: []
};







/**
 *
 */
process.on('message', (msg) => {
  if (!(msg && (typeof msg === 'object') && (has(msg, 'start')))) {
    console.error(">>> Mensagem INVALIDA.", msg);
    return;
  }

  if ((lat_min + msg.start) > lat_max) {
    console.error(`>>> Segmento '${msg.start}' FORA do range`);
    return;
  }

  makeLatitudes(
    options,
    msg.id,
    options.destPath,
    (msg, funcName, code) => {
      console.error(funcName, code, msg);
      process.send({
        error: {
          funcName: funcName,
          code: code,
          msg: msg
        }
      });

      terminate();
    },
    (id, first_lat, latitude, long_int_part, write_return_status, dont_increaseOrFinished) => {
      let send = {
        id: id,
        first_lat: first_lat,
        latitude: latitude.toFixed(precision),
        longitude: long_int_part,
        write_return_status: write_return_status
      };

      if (
        typeof dont_increaseOrFinished === 'object' &&
        has(dont_increaseOrFinished, 'finished') &&
        (typeof dont_increaseOrFinished.finished === "object")
      ) {
        send = mergeDeep(send, dont_increaseOrFinished);
      } else {
        send.increase = dont_increaseOrFinished;
      }

      process.send(send);
    }
  );
});

/**
 *
 */
function terminate() {
  process.exit();
}

/**
 *
 * @param {*} s
 * @returns
 */
function secondsFormated(s) {
  const d = Math.floor(s / 86400);
  s = s % 86400;
  const h = Math.floor(s / 3600);
  s = s % 3600;
  const m = Math.round(s / 60);
  s = s % 60;

  return `${d}, ${(String(h).padStart(2, "0"))}:${(String(m).padStart(2, "0"))}:${(String(s).padStart(2, "0"))}`;
}

/**
 *
 */
function main() {
  var __total = 0;
  var makes = {};
  var isStopedSeconds_bars = (Array(qtd_process + 1)).fill(0);
  var progressbars = (Array(qtd_process)).fill(0);
  var processStarted = (Array(qtd_process)).fill(false);
  var totalPerProcess = [];

  if (save_merged_json && fs.existsSync(`${destPath}/full.temp.json`)) {
    makes = JSON.parse(fs.readFileSync(`${destPath}/full.temp.json`, 'ascii'));
  }

  console.log("");
  console.log("Inicializando.");
  console.log("");
  console.log("Precisão...............: " + precision);
  console.log("Incrementos............: " + (inc * inc_multiply));
  console.log("Processos..............: " + qtd_process);
  console.log("Latitudes por processo.: " + segs);
  console.log("QTD Longitudes.........: " + qtd_longitudes.toLocaleString("pt-BR"));
  console.log("QTD decimal Latitudes..: " + qtd_decpart_latitudes.toLocaleString("pt-BR"));
  console.log("QTD por processo.......: " + qtd_per_process.toLocaleString("pt-BR"));
  console.log("QTD total estimada.....: " + qtd_all.toLocaleString("pt-BR"));
  console.log("Progress update on.....: " + update_count);
  console.log("Save Path..............: " + root);
  console.log("");

  let runtime_byitem_calcs = [];

  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    autopadding: true,
    autopaddingChar: " ",
    emptyOnZero: true,
    forceRedraw: true,
    barsize: 20,
    /*
      parametros:
      {
        progress: 0.002777777777777778,
        eta: 115,
        startTime: 1702155963656,
        stopTime: null,
        total: 36000,
        value: 100,
        maxWidth: 134
      } {
        k: 39,
        percentage_all: '  0',
        start: '-51',
        skipped: 'Skipped',
        step: '   0',
        astep: ' 400',
        lat: ' -51.99',
        long: '-180.00',
        index: ' 39'
      }
            {
              global_progress
              id
              write_return_status
              first_lat
              latitude
              longitude
            }
    */
    format: (options, params, values) => {
      function getVal(x) {
        if (has(values, x) && (typeof values[x] !== "undefined")) {
          return values[x];
        }

        return "";
      }

      function newBar(isMain, k, percent, size, ok, unok) {
        ok = (typeof ok === 'string' && ok.length === 1) ? ok : options.barCompleteString;
        unok = (typeof unok === 'string' && unok.length === 1) ? unok : '\u2500';
        const completed = Math.floor(percent * size);
        return ((isStopedSeconds_bars[k] > isFreezeSeconds) ? colors.redBright : (isMain ? colors.greenBright : colors.cyan))("".padStart(completed, ok))
          + colors.gray(unok.padStart(size - completed, unok));
      }

      if (params.value === 0) {
        return "";
      }

      let p_total = "" + ((params.total)).toLocaleString("pt-BR");
      let p_val = "" + ((params.value)).toLocaleString("pt-BR").padStart(p_total.length, " ");

      const k = (getVal('k') !== "" && getVal('k') >= 0)
        ? getVal('k')
        : isStopedSeconds_bars.length - 1;

      const isMain = (k === (isStopedSeconds_bars.length - 1));

      const main_p_size = options.barsize;
      const step_p_size = options.barsize;

      const pbar = newBar(isMain, k, params.progress, main_p_size, '\u25A0');
      const stepbar = isMain ? "" : newBar(isMain, k, values.step / values.astep, step_p_size, "■");

      let lapse = "0, 00:00:00";
      let remaining = lapse;
      let process_p = 0;
      let ms_by_item = 0;

      const stepmax = getVal('astep') * params.total;

      if (isMain) {
        let runtime = Date.now() - startedTime;
        lapse = secondsFormated(Math.floor(runtime / 1000));

        runtime_byitem_calcs.push(runtime / params.value / 1000);

        while (runtime_byitem_calcs.length > qtd_process * 7) {
          runtime_byitem_calcs.shift();
        }

        for (let i = 0; i < runtime_byitem_calcs.length; i++) {
          ms_by_item += runtime_byitem_calcs[i];
        }

        ms_by_item = ms_by_item / runtime_byitem_calcs.length;
        remaining = secondsFormated(Math.round(ms_by_item * (params.total - params.value)));
        ms_by_item = String(ms_by_item.toFixed(3).toLocaleString('pt-BR')).padStart(7, " ");
      } else {
        const makestep = (getVal('step') * params.total) + params.value;
        process_p = String((makestep / stepmax * 100).toFixed(2)).padStart(6, " ");
      }

      let rr = `${getVal('index')}: |${pbar}| ` + (
        isMain
          ? `${String(((params.progress) * 100).toFixed(4)).padStart(9, " ")}% ▐ ${ms_by_item} s/item ▐ Elapsed: ${(String(lapse).padStart(12, " "))} | Remaining: ${(String(remaining).padStart(12, " "))} ▐ ${p_val}/${p_total}`
          : `${String(Math.round((params.progress) * 100)).padStart(3, " ")}% / ${process_p}% ▐ ${getVal('start')} → ${getVal('lat').padStart(1 + 3 + 1 + precision, " ")}/${getVal('long').padStart(1 + 3 + 1 + precision, " ")}, ${(((getVal('skipped') === "SKIPPED") ? colors.bgBlue : colors.bgBlack)(" " + getVal('skipped') + " "))} ▐ Segs: ${getVal('segs').toFixed(2)} ▐ step: |${stepbar}| ${String(getVal('step')).padStart(3, " ")}/${String(Math.round(getVal('astep'))).padStart(3, " ")} of ${p_val}/${p_total}: ${(stepmax.toLocaleString("pt-BR"))}`
      );

      return (isMain ? colors.bgBlack : colors.bgBlack)(rr);
    }

  }, cliProgress.Presets.shades_grey);

  /**
   * CREATE PROGRESSBAR
   */
  (Array(qtd_process).fill('0')).forEach((e, k) => {
    var __counter = [0, 0];
    const bar = multibar.create(qtd_longitudes, 0);
    progressbars[k] = bar;

    fork(process.argv[1], (() => {
      const nn = process.argv;
      nn[nn.indexOf('start')] = '';
      return nn;
    })())
      .on('message', (msg) => {
        ((progress) => {
          if (
            (typeof msg !== 'object') ||
            (!has(msg, 'id'))
          ) {
            return;
          }

          if (has(msg, "error")) {
            console.error("Child '", k, "' exited with data:", msg.error);
            return terminate();
          }



          isStopedSeconds_bars[k] = 0;


          if (has(msg, "increase") && msg.increase) {
            if (!processStarted[k]) {
              processStarted[k] = true;
              totalPerProcess.push(msg.segs * qtd_decpart_latitudes);
            }

            __counter[0] += options.decimal_lg_size;
            __counter[1] += options.decimal_lg_size

            if ((__counter[0] % qtd_longitudes) === 0) {
              __counter[0] = 0;
            }

            __total += msg.mymakes;
          }

          if (has(msg, "finished") && (typeof msg.finished === "object")) {
            isStopedSeconds_bars[k] === true;
            progress(msg, [qtd_longitudes, qtd_per_process]);
            bar.stop();
            makes = mergeDeep(makes, msg.finished);

            return;
          }

          try {
            progress(msg, __counter);
          } catch (e) {

          }
        })((msg, val) => {
          bar.update(
            val[0],
            {
              global_progress: val[1],
              id: k,
              write_return_status: (
                typeof write_return_status === "object"
                  ? "Built"
                  : (
                    write_return_status === 0
                      ? SKIPPED
                      : (
                        write_return_status === 1
                          ? "SEAN"
                          : "???"
                      )
                  )
              ),
              first_lat: msg.first_lat,
              latitude: msg.latitude,
              longitude: msg.longitude,
            }
          );
        });
      })
      .send({ start: k });
  });

  var bar_total = false;
  var intervalo;

  /**
   * UPDATE GLOBAL PROGRESS BART
   */
  intervalo = setInterval(() => {
    if (!bar_total) {
      if (totalPerProcess.length == qtd_process) {
        let sum = 0;

        for (let i = 0; i < totalPerProcess.length; i++) {
          sum += totalPerProcess[i];
        }

        bar_total = multibar.create(sum, 0);
      }
    }

    if (!bar_total) {
      return;
    }

    bar_total.update(__total, {
      index: "---"
    });

    if (__total >= qtd_all) {
      bar_total.stop();
      console.log("");
      save_merged_json &&
        writedata(`${destPath}/full.json`, JSON.stringify(makes, null, 0)) &&
        fs.unlinkSync(`${destPath}/full.temp.json`);
      clearInterval(intervalo);
      return;
    }

    isStopedSeconds_bars[isStopedSeconds_bars.length - 1] = 0;

    for (var k = 0; k < progressbars.length; k++) {
      if (typeof isStopedSeconds_bars[k] !== 'boolean') {
        isStopedSeconds_bars[k]++;

        if (isStopedSeconds_bars[k] > isFreezeSeconds) {
          isStopedSeconds_bars[isStopedSeconds_bars.length - 1] = isFreezeSeconds + 1;
          progressbars[k].update(null);
        }
      }
    }
  }, 1000);
}

/**
 *
 */
if (getCMDParam('start')) {
  main();
}