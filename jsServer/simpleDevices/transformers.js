this.passive = function(parameters, dataBaseElements) {
  const fs = require("fs");
  const alpha = 13;
  const T0 = parameters.ambientTemperature;
  const copperResistivity = 0.018e-6;
  const copperDensity = 8900;
  const mu0 = 12.566e-7;
  const j0 = 5e6;

  let transformers = [];

  class Transformer {
    constructor(core, winding1, winding2, transformer) {
      // Параметры магнитопровода
      this.core = core;      

      // Параметры первичной обмотки
      this.winding1 = {
        // Количество витков
        w: winding1.w1,
        // Количество параллельных проводов
        parallelWires: winding1.wire1ParallelNum,
        // Длина
        l: winding1.l1sum,
        // Значение напряжения с учетом стабилизации
        UrmsReal: winding1.U1rmsReal,
        // Масса
        mass: winding1.wire1.mass * winding1.l1sum * winding1.wire1ParallelNum,
        // Провод
        wire: winding1.wire1,
        // Стоимость
        price: winding1.l1sum * winding1.wire1ParallelNum * winding1.wire1.price
      };

      // Параметры вторичной обмотки
      this.winding2 = {
        // Количество витков
        w: winding2.w2,
        // Количество параллельных проводов
        parallelWires: winding2.wire2ParallelNum,
        // Длина
        l: winding2.l2sum,
        // Значение напряжения без стабилизации
        UrmsReal: winding2.U2rmsReal,
        // Масса
        mass: winding2.wire2.mass * winding2.l2sum * winding2.wire2ParallelNum,
        // Провод
        wire: winding2.wire2,
        // Стоимость
        price: winding2.l2sum * winding2.wire2ParallelNum * winding2.wire2.price
      };

      // Параметры трансформатора
      this.K12 = transformer.K12;
      this.Kwindow = transformer.Swindings / transformer.Swindow;
      this.Bm = transformer.Bm;
      this.Tmax = transformer.Tmax;
      this.T = transformer.T;
      this.Plosses = transformer.Plosses;
      this.price = this.winding1.price + this.winding2.price + this.core.price;
      this.lossesCost = this.Plosses * parameters.energyPrice;
      this.totalCosts = this.price + this.lossesCost;
      this.mass = this.winding1.mass + this.winding2.mass + this.core.mass;
    }
  }

  console.time('creating');
  for (let coreNum = 0; coreNum < dataBaseElements.cores.length; coreNum++) {
    //console.log('transformers calcualtion', ((coreNum + 1) / dataBaseElements.cores.length * 100).toFixed(0), '%');

    if (dataBaseElements.cores[coreNum].materialParams != null) {
      if (dataBaseElements.cores[coreNum].form == 'кольцо') {
        const core = dataBaseElements.cores[coreNum];

        // Размеры магнитопровода
        const Score = 0.5 * (core.OD - core.ID) * core.h;
        const Swindow = Math.PI * Math.pow((0.5 * core.ID), 2);
        const Vcore = Math.PI * Score * (0.5 * (core.OD - core.ID) + core.ID);

        // Плотность магнитопровода
        const coreDensity = core.mass / Vcore;

        // Предварительный расчет коэффициента трансформации
        let K12 = parameters.U1rms / parameters.U2;

        // Предварительный расчет амплитуды магнитной индукции
        let Bm = 0.5 * core.materialParams.Bs;

        // Предварительное значение количества витков обмоток трансформатора
        let w1 = Math.floor(parameters.U1rms / (4.441 * parameters.f1 * Bm * Score * parameters.Kf1));
        let w2 = Math.ceil(w1 / K12);

        // Цикл корректировки параметров трансформатора
        while ((w1 < 3) || (w2 < 3)) {
          // Корректировка значения магнитной индукции
          Bm = Bm - 0.005;

          // Пересчет количества витков обмоток трансформатора
          w1 = Math.floor(parameters.U1rms / (4.441 * parameters.f1 * Bm * Score * parameters.Kf1));
          w2 = Math.ceil(w1 / K12);
        }

        // Потери в магнитопроводе
        let Pcore;
        if (core.materialParams.Pv0 != 0) {
          Pcore = Vcore * core.materialParams.Pv0 * core.materialParams.f0 * (parameters.Kf1 / 1.111) * Math.pow((Bm / core.materialParams.B0), 2) /** Math.pow((parameters.f1 / core.materialParams.f0), 1.5)*/;
        } else if (core.materialParams.tgdelta != 0) {
          const B0 = mu0 * core.materialParams.mu * core.materialParams.H0;
          const Pm0 = (13 * core.materialParams.tgdelta * Math.PI * core.materialParams.f0 * Math.pow(B0, 2)) / (mu0 * coreDensity);
          Pcore = Pm0 * core.mass * Math.pow((Bm / B0), 2) * Math.pow((parameters.f1 / core.materialParams.f0), 1.5) * (parameters.Kf1 / 1.111);
        }

        // Пересчет коэффициента трансформации
        K12 = w1 / w2;

        // Значение напряжения первичной обмотки с учетом стабилизации
        const U1rmsReal = parameters.U2 * K12;
        // Значение напряжения вторичной обмотки без стабилизации
        const U2rmsReal = parameters.U1 / K12;

        // Цикл подбора провода первичной обмотки
        for (let wire1Num = 0; wire1Num < dataBaseElements.wires.length; wire1Num++) {

          // Цикл параллельного наращивания проводов
          wire1Parallel_loop: for (let wire1ParallelNum = 1; wire1ParallelNum < 51; wire1ParallelNum++) {
            let wire1 = dataBaseElements.wires[wire1Num];
            let nAdd1 = 2;
            let lAdd1 = 4;
            let n1 = [];
            let l1 = [];
            let l1sum = 0;
            let n1diffw1;
            let w1diffn1 = w1 * wire1ParallelNum;

            // Цикл расположения первичной обмотки по слоям
            for (let layerNumW1 = 0; layerNumW1 > -1; layerNumW1++) {
              // Количество проводов в i-ом слое
              n1[layerNumW1] = Math.trunc(Math.PI * (core.ID - (nAdd1 * wire1.dm / 2)) / wire1.dm);
              // Длина витка i-го слоя
              l1[layerNumW1] = 2 * (core.h + (core.OD - core.ID) / 2) + (lAdd1 * wire1.dm / 2);

              // Коэффициент увеличения длины обмотки и уменьшения длины окружности окна магнитопровода
              nAdd1 = nAdd1 + 4;
              lAdd1 = lAdd1 + 8;

              // Разница между количеством умещающихся проводов в слое и количеством необходимых проводов
              n1diffw1 = n1[layerNumW1] - w1diffn1;

              // Продолжение цикла наращивания количества слоев первичной обмотки
              if ((n1diffw1 < 0) && (n1[layerNumW1] > 0)) {
                // Суммарная длина первичной обмотки
                l1sum = l1sum + l1[layerNumW1] * n1[layerNumW1];
                // Количество проводов, требующих размещения на следующих слоях
                w1diffn1 = w1diffn1 - n1[layerNumW1];

              } else if (n1[layerNumW1] <= 0) {
                // Завершение цикла расположения первичной обмотки по слоям из-за малого пространства в окне магнитопровода
                break wire1Parallel_loop;

              } else if (n1diffw1 >= 0) {
                // Суммарная длина первичной обмотки
                l1sum = l1sum + l1[layerNumW1] * w1diffn1;

                // Суммарная длина первичной обмотки с учетом намотки в несколько проводов
                l1sum = l1sum / wire1ParallelNum;

                // Цикл подбора провода вторичной обмотки
                for (let wire2Num = 0; wire2Num < dataBaseElements.wires.length; wire2Num++) {

                  // Цикл параллельного наращивания проводов
                  wire2Parallel_loop: for (var wire2ParallelNum = 1; wire2ParallelNum < 51; wire2ParallelNum++) {
                    let wire2 = dataBaseElements.wires[wire2Num];
                    let nAdd2 = nAdd1;
                    let lAdd2 = lAdd1;
                    let n2 = [];
                    let l2 = [];
                    let l2sum = 0;
                    let n2diffw2;
                    let w2diffn2 = w2 * wire2ParallelNum;

                    // Цикл расположения вторичной обмотки по слоям
                    for (let layerNumW2 = layerNumW1 + 1; layerNumW2 > 0; layerNumW2++) {

                      // Количество проводов в i-ом слое
                      n2[layerNumW2] = Math.trunc(Math.PI * (core.ID - (nAdd2 * wire2.dm / 2)) / wire2.dm);
                      // Длина витка i-го слоя
                      l2[layerNumW2] = 2 * (core.h + (core.OD - core.ID) / 2) + (lAdd2 * wire2.dm / 2);

                      // Коэффициент увеличения длины обмотки и уменьшения длины окружности окна магнитопровода
                      nAdd2 = nAdd2 + 4;
                      lAdd2 = lAdd2 + 8;

                      // Разница между количеством умещающихся проводов в слое и количеством необходимых проводов
                      n2diffw2 = n2[layerNumW2] - w2diffn2;

                      // Продолжение цикла наращивания количества слоев вторичной обмотки
                      if ((n2diffw2 < 0) && (n2[layerNumW2] > 0)) {
                        // Суммарная длина втричной обмотки
                        l2sum = l2sum + l2[layerNumW2] * n2[layerNumW2];
                        // Количество проводов, требующих размещения на следующих слоях
                        w2diffn2 = w2diffn2 - n2[layerNumW2];

                      } else if (n2[layerNumW2] <= 0) {
                        // Завершение цикла расположения втричной обмотки по слоям из-за малого пространства в окне магнитопровода
                        break wire2Parallel_loop;

                      } else if (n2diffw2 >= 0) {
                        // Суммарная длина вторичной обмотки
                        l2sum = l2sum + l2[layerNumW2] * w2diffn2;

                        // Суммарная длина вторичной обмотки с учетом намотки в несколько проводов
                        l2sum = l2sum / wire2ParallelNum;

                        // Вычисление площади охлаждения трансформатора
                        let nAdd = 2;
                        let lAdd = 4;
                        let n = [];
                        let l = [];
                        let wdiffn;

                        // Вычисление площади последнего слоя первичной обмотки
                        wdiffn = w1 * wire1ParallelNum;

                        // Площадь первичной обмотки внешней тороидальной части
                        for (let i = 0; i < n1.length; i++) {
                          n[i] = Math.trunc(Math.PI * (core.OD + (nAdd * wire1.dm / 2)) / wire1.dm);
                          l[i] = 2 * (core.h + (core.OD - core.ID) / 2) + (lAdd * wire1.dm / 2);
                          nAdd = nAdd + 4;
                          lAdd = lAdd + 8;
                          wdiffn = wdiffn - n[i];
                          if (wdiffn <= 0) {
                            layerNum = i;
                            i = n1.length;
                          }
                        }
                        const Sext1 = Math.PI * wire1.dm * l[layerNum] * n[layerNum] * 0.25;

                        // Вычисление площади последнего слоя вторичной обмотки
                        wdiffn = w2 * wire2ParallelNum;

                        // Площадь вторичной обмотки внешней тороидальной части
                        for (let i = layerNum + 1; i < n2.length; i++) {
                          n[i] = Math.trunc(Math.PI * (core.OD + (nAdd * wire2.dm / 2)) / wire2.dm);
                          l[i] = 2 * (core.h + (core.OD - core.ID) / 2) + (lAdd * wire2.dm / 2);
                          nAdd = nAdd + 4;
                          lAdd = lAdd + 8;
                          wdiffn = wdiffn - n[i];
                          if (wdiffn <= 0) {
                            layerNum = i;
                            i = n2.length;
                          }
                        }
                        const Sext2 = Math.PI * wire2.dm * l[layerNum] * n[layerNum] * 0.25;

                        if ((layerNumW2 - layerNumW1) == 1) {
                          // Площадь первичной обмотки внутренней тороидальной части
                          Sint = Math.PI * wire1.dm * l1[layerNumW1] * n1[layerNumW1] * 0.25;
                          Scooling = Sint + Sext1;
                        } else {
                          // Площадь вторичной обмотки внутренней тороидальной части
                          Sint = Math.PI * wire2.dm * l2[layerNumW2] * n2[layerNumW2] * 0.25;
                          Scooling = Sint + Sext2;
                        }

                        // Сопротивление первичной обмотки
                        const R1 = l1sum * copperResistivity / (wire1.q * wire1ParallelNum);
                        // Сопротивление вторичной обмотки
                        const R2 = l2sum * copperResistivity / (wire2.q * wire2ParallelNum);

                        // Максимальная допустимая температура трансформатора
                        const Tmax = Math.min.apply(Math, [core.materialParams.Tmax, wire1.Tmax, wire2.Tmax]);

                        // Потери в обмотках
                        const P1 = ((parameters.I2 / K12)**2) * R1;
                        const P2 = (parameters.I2**2) * R2;
                        // Потери в трансформаторе
                        const Plosses = Pcore + P1 + P2;

                        // Рабочая температура трансформатора
                        const T = T0 + (Plosses / (alpha * Scooling));

                        if (T < (Tmax * (1 - parameters.powerTransformersReserve / 100))) {
                          // Запись параметров первичной и вторичной обмотки в массив для проверки коэффициента окна
                          // Площадь поперечного сечения первичной обмотки
                          const qm1 = Math.PI * ((wire1.dm / 2)**2);
                          // Площадь поперечного сечения вторичной обмотки
                          const qm2 = Math.PI * ((wire2.dm / 2)**2);
                          // Площадь в окне магнитопровода, занятая обмотками
                          const Swindings = qm1 * w1 * wire1ParallelNum + qm2 * w2 * wire2ParallelNum;

                          // Добавить новый трансформатор в массив трансформаторов на основе расчитанных параметров сердечника и обмоток
                          transformers.push(new Transformer(
                            core,
                            {w1, wire1ParallelNum, l1sum, U1rmsReal, wire1},
                            {w2, wire2ParallelNum, l2sum, U2rmsReal, wire2},
                            {K12, Swindings, Swindow, Bm, Tmax, T, Plosses}
                          ));
                        }
                        
                        break;
                      }
                    }
                  }
                }

                // Завершение цикла расположения первичной обмотки по слоям из-за успешного расположения в окне магнитопровода
                break;
              }
            }
          }
        }
      }
    }
  }
  console.timeEnd('creating');

  console.time('sorting');
  // Сортировка массива трансформаторов
  transformers.sort((a, b) => a.totalCosts - b.totalCosts);
  console.timeEnd('sorting');

  console.time('deleting: step 1');
  // Удаление экономически невыгодных трансформаторов
  let oldLength = 0;
  while (transformers.length !== oldLength) {
    oldLength = transformers.length;
    transformers = transformers.filter((item, i, arr) => (i !== 0) ? item.T < arr[i - 1].T : true);
  }
  console.timeEnd('deleting: step 1');

  console.time('deleting: step 2');
  // Удаление экономически невыгодных трансформаторов
  oldLength = 0;
  while (transformers.length !== oldLength) {
    oldLength = transformers.length;
    transformers = transformers.filter((item, i, arr) => (i !== 0) ? +item.T.toFixed(1) < +arr[i - 1].T.toFixed(1) : true);
  }
  console.timeEnd('deleting: step 2');

  console.time('calc params');
  // Округление параметров трансформаторов
  for (let i = 0; i < transformers.length; i++) {
    transformers[i].winding1.price = +transformers[i].winding1.price.toFixed(2);
    transformers[i].winding2.price = +transformers[i].winding2.price.toFixed(2);
    transformers[i].winding1.UrmsReal = +transformers[i].winding1.UrmsReal.toFixed(1);
    transformers[i].winding2.UrmsReal = +transformers[i].winding2.UrmsReal.toFixed(1);
    transformers[i].K12 = +transformers[i].K12.toFixed(2);
    transformers[i].Bm = +transformers[i].Bm.toFixed(3);
    transformers[i].Kwindow = +transformers[i].Kwindow.toFixed(2);
    transformers[i].Plosses = +transformers[i].Plosses.toFixed(2);
    transformers[i].T = +transformers[i].T.toFixed(1);
    transformers[i].price = +transformers[i].price.toFixed(2);
    transformers[i].lossesCost = +transformers[i].lossesCost.toFixed(2);
    transformers[i].totalCosts = +transformers[i].totalCosts.toFixed(2);
    transformers[i].mass = +transformers[i].mass.toFixed(4);
  }
  console.timeEnd('calc params');

  console.log('num of transformers:', transformers.length);

  fs.writeFileSync('./dataBase/test/transformers.json', JSON.stringify(transformers));

  return transformers;
}



// let same;
// const parametersFile = JSON.parse(fs.readFileSync('./dataBase/temp/Parameters.json', 'utf8'));
// for (let key1 in parameters) {
//   for (let key2 in parametersFile) {
//    if ((key1 == key2) && (parameters[key1] != parametersFile[key2])) {
//      same = false;
//      break;
//    }
//   }
// }
// if (same) {
//  transformers = JSON.parse(fs.readFileSync('./dataBase/temp/Transformers.json', 'utf8'));
// } else {
// }