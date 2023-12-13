
import * as path from 'path';
import * as cliProgress from 'cli-progress';
import * as os from 'os';
import { fork } from 'child_process';
import colors from 'ansi-colors';
import { getCMDParam, has, mergeDeep } from './.maker/commom.js';
import {makeLatitudes} from "./.maker/makeLatitudes.js"

const startedTime = Date.now();

const ___pre_ = {
  precision: getCMDParam('p', 'precision', 2)
  , update_count: getCMDParam('u', 'update', 100)
  , isFreezeSeconds: getCMDParam('u', 'update', 20)
  , root: getCMDParam('r', 'root', 'from').trim().replace(/["']/g, "").trim()

  , save_json: getCMDParam('j', 'save-json', false)
  , save_merged_json: getCMDParam('f', 'save-full-json', false)
  , save_raw: getCMDParam('s', 'save-raw', true)
  , qtd_process: getCMDParam('t', 'threads', Math.ceil(os.cpus().length))
  , inc_multiply: getCMDParam('m', 'multiply', 1)

  , lat_min: -58
  , lat_max: 84
  , long_min: -180
  , long_max: 180
};

const ___pre_2 = mergeDeep({
  decimal_lt_size: Math.pow(10, ___pre_.recision)
  , decimal_lg_size: Math.pow(10, ___pre_.precision)
  , lat_range: (___pre_.lat_max - ___pre_.lat_min)
  , long_range: (___pre_.long_max - ___pre_.long_min)
}, ___pre_);

const ___pre_3 = mergeDeep({
  segs: Math.ceil(___pre_2.at_range / ___pre_2.qtd_process)
  , qtd_longitudes: ___pre_2.long_range * ___pre_2.decimal_lg_size
}, ___pre_2);

const ___pre_4 = mergeDeep({
  qtd_decpart_latitudes: ___pre_3.decimal_lt_size * ___pre_3.qtd_longitudes
}, ___pre_3);

const options = mergeDeep({
  qtd_longitudes: ___pre_4.long_range * ___pre_4.decimal_lg_size
  , qtd_all: ___pre_4.lat_range * ___pre_4.qtd_decpart_latitudes
  , qtd_per_process: ___pre_4.segs * ___pre_4.qtd_decpart_latitudes
  , destPath: path.join(`${___pre_4.root}/gcs/${(___pre_4.precision)}-digit`)
  , pad_adress: 1 + 3 + 1 + ___pre_4.precision
}, ___pre_4);







/**
 *
 */
process.on('message', (msg) => {
  if (!(msg && (typeof msg === 'object') && (has(msg, 'start')))) {
    console.error(">>> Mensagem INVALIDA.", msg);
    return;
  }

  if ((options.lat_min + msg.start) > options.lat_max) {
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
  var __total = { complete: 0, forced: 0 };
  var makes = {};
  var isStopedSeconds_bars = (Array(options.qtd_process + 1)).fill(0);
  var progressbars = (Array(options.qtd_process)).fill(0);
  var processStarted = (Array(options.qtd_process)).fill(false);
  var totalPerProcess = [];

  if (options.save_merged_json && fs.existsSync(`${options.destPath}/full.temp.json`)) {
    makes = JSON.parse(fs.readFileSync(`${options.destPath}/full.temp.json`, 'ascii'));
  }

  console.log("");
  console.log("Inicializando.");
  console.log("");
  console.log("Precisão...............: " + options.precision);
  console.log("Incrementos............: " + (options.inc * options.inc_multiply));
  console.log("Processos..............: " + options.qtd_process);
  console.log("Latitudes por processo.: " + options.segs);
  console.log("QTD Longitudes.........: " + options.qtd_longitudes.toLocaleString("pt-BR"));
  console.log("QTD decimal Latitudes..: " + options.qtd_decpart_latitudes.toLocaleString("pt-BR"));
  console.log("QTD por processo.......: " + options.qtd_per_process.toLocaleString("pt-BR"));
  console.log("QTD total estimada.....: " + options.qtd_all.toLocaleString("pt-BR"));
  console.log("Progress update on.....: " + options.update_count);
  console.log("Save Path..............: " + options.root);
  console.log("");

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
              global_makes
              id
              write_return_status
              first_lat
              latitude
              longitude
            }
    */
    format: (options, params, values) => {
      function getVal(x) {
        if (has(values, x)) {
          return values[x];
        }

        return "";
      }

      function isfreeze(index) {
        return (typeof isStopedSeconds_bars[index] !== "boolean") ||
          (isStopedSeconds_bars[index] > isFreezeSeconds);
      }

      function newBar(isMain, index, percent, size, ok, unok) {
        ok = (typeof ok === 'string' && ok.length === 1) ? ok : options.barCompleteString;
        unok = (typeof unok === 'string' && unok.length === 1) ? unok : '\u2500';
        const completed = Math.floor(percent * size);
        return (
          (isfreeze(index)
            ? colors.redBright
            : (
              isMain
                ? colors.greenBright
                : colors.cyan
            )
          )("".padStart(completed, ok))
        ) + colors.gray(unok.padStart(size - completed, unok));
      }

      const id = (getVal('id') !== "" && getVal('id') >= 0)
        ? getVal('id')
        : isStopedSeconds_bars.length - 1;

      const isMain = (id === (isStopedSeconds_bars.length - 1));

      const main_p_size = options.barsize;
      const step_p_size = options.barsize;
      const global_progress = values.global_makes / values.global_full;

      const pbar = newBar(isMain, id, params.progress, main_p_size, '\u25A0');
      const gbar = isMain ? "" : newBar(isMain, id, global_progress, step_p_size, "■");

      let lapse = "0, 00:00:00";
      let remaining = lapse;
      let process_p = 0;
      let ms_by_item = 0;

      if (isMain) {
        let runtime = Date.now() - startedTime;
        lapse = secondsFormated(Math.floor(runtime / 1000));

        const runtime_byitem_calcs = runtime / values.global_full / 1000;

        ms_by_item = ms_by_item / runtime_byitem_calcs.length;
        remaining = secondsFormated(Math.round(ms_by_item * (params.total - params.value)));
        ms_by_item = String(ms_by_item.toFixed(3).toLocaleString('pt-BR')).padStart(7, " ");
      } else {
        const makestep = (getVal('step') * params.total) + params.value;
        process_p = String((makestep / stepmax * 100).toFixed(2)).padStart(6, " ");
      }

      let rr = `${getVal('id')}: |${gbar}| ` + (
        isMain
          ? [
            String(((params.progress) * 100).toFixed(4)).padStart(9, " "),
            "% ▐",
            ms_by_item,
            "s/item ▐ Elapsed:",
            String(lapse).padStart(12, " "),
            "| Remaining: ",
            (String(remaining).padStart(12, " ")),
            "▐",
            ((params.value)).toLocaleString("pt-BR").padStart(((params.total)).toLocaleString("pt-BR").length, " "),
            "/",
            ((params.total)).toLocaleString("pt-BR")
          ].join(' ')

          : [
            String(Math.round((global_progress) * 100)).padStart(3, " "),
            "% /",
            process_p,
            "% ▐",
            getVal('start'),
            "→",
            getVal('latitude').padStart(1 + 3 + 1 + precision, " "),
            "/",
            getVal('longitude').toFixed(0).padStart(1 + 3 + 1 + precision, " "),
            ",",
            (
              ((x) => {
                return (
                  typeof x === "object"
                    ? "Built"
                    : (
                      x === 0
                        ? colors.bgBlue("SKIPPED")
                        : (
                          x === 1
                            ? colors.bgGreen("SEAN")
                            : colors.bgRedBright("???")
                        )
                    )
                )
              })(getVal('write_return_status'))
            ),
            "▐ Longitude Progress:",
            getVal('segs').toFixed(2),
            " step:",
            "|",
            pbar,
            "|",
            String(((params.progress) * 100).toFixed(4)).padStart(9, " "),
            ",",
            ((params.value)).toLocaleString("pt-BR").padStart(p_total.length, " "),
            "/",
            ((params.total)).toLocaleString("pt-BR")
          ].join(" ")
      );

      return (isMain ? colors.bgBlack : colors.bgBlack)(rr);
    }

  }, cliProgress.Presets.shades_grey);

  /**
   * CREATE PROGRESSBAR
   */
  (Array(options.qtd_process).fill('0')).forEach((e, k) => {
    var __counter = { comleted: { part_val: 0, global_val: 0 }, forced: { part_val: 0, global_val: 0 } };
    const bar = multibar.create(options.qtd_longitudes, 0);
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

            if (typeof msg.increase === "numeric") {
              __counter.forced.part_val += msg.increase;
              __counter.forced.global_val += msg.increase;
              __total.forced += msg.increase;
            } else {
              __counter.comleted.part_val += options.decimal_lg_size;
              __counter.comleted.global_val += options.decimal_lg_size;
              __total.completed += options.decimal_lg_size;
            }

            __counter.forced.part_val = (
              (__counter.forced.part_val > (__counter.comleted.part_val + options.decimal_lg_size))
            )
              ? (__counter.comleted.part_val + options.decimal_lg_size)
              : __counter.forced.part_val;

            __counter.forced.global_val = (
              (__counter.forced.global_val > (__counter.comleted.global_val + options.decimal_lg_size))
            )
              ? (__counter.comleted.part_val + options.decimal_lg_size)
              : __counter.forced.global_val;

            const part_val = __counter.comleted.part_val > __counter.forced.part_val
              ? __counter.comleted.part_val
              : __counter.forced.part_val;

            const global_val = __counter.comleted.global_val > __counter.forced.global_val
              ? __counter.comleted.global_val
              : __counter.forced.global_val;

            if ((part_val % qtd_longitudes) === 0) {
              if (__counter.comleted.part_val > __counter.forced.part_val) {
                __counter.comleted.part_val = 0;
              } else {
                __counter.forced.part_val = 0;
              }
            }
          }

          if (has(msg, "finished") && (typeof msg.finished === "object")) {
            isStopedSeconds_bars[k] === true;
            progress(msg, [qtd_longitudes, qtd_per_process]);
            bar.stop();
            makes = mergeDeep(makes, msg.finished);

            return;
          }

          try {
            progress(msg, [part_val, global_val]);
          } catch (e) {

          }
        })((msg, val) => {
          bar.update(
            val[0],
            {
              global_makes: val[1],
              id: k,
              write_return_status: write_return_status,
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

    const tot = __total.comleted.part_val > __total.forced.part_val
      ? __total.comleted.part_val
      : __total.forced.part_val

    bar_total.update(tot, {
      index: -1
    });

    if (tot >= qtd_all) {
      bar_total.stop();
      console.log("");
      save_merged_json &&
        writedata(`${destPath} /full.json`, JSON.stringify(makes, null, 0)) &&
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