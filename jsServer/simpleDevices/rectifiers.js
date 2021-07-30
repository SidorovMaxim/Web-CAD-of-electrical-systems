this.passiveDiodes = function(parameters, dataBaseElements, phaseScheme) {
  const fs = require("fs");
  let rectifiers = [];
  let rectifiersTemp = [];
  let numRectifier = 0;

  // Массив схем выпрямителей
  let rectificationDevices =
    [{
      'type': 'Двухполупериодный со средней точкой (Миткевича)',
      'phaseDevice': 2,
      'diodesNum': 2,
      'transformerLeadsNum': 3,
      'numDiodesVoltageDropInit': 1,
      'devicePulsation': 2
    }, {
      'type': 'Полный мост (Гретца)',
      'phaseDevice': 1,
      'diodesNum': 4,
      'transformerLeadsNum': 2,
      'numDiodesVoltageDropInit': 2,
      'devicePulsation': 2
    }, {
      'type': 'Однополупериодный (четвертьмост)',
      'phaseDevice': 1,
      'diodesNum': 1,
      'transformerLeadsNum': 2,
      'numDiodesVoltageDropInit': 1,
      'devicePulsation': 1
    }, {
      'type': 'Трехфазный мостовой (Ларионова)',
      'phaseDevice': 3,
      'diodesNum': 6,
      'transformerLeadsNum': 3,
      'numDiodesVoltageDropInit': 2,
      'devicePulsation': 6
    }, {
      'type': 'Трехфазный двенадцатипульсный мостовой',
      'phaseDevice': 3,
      'diodesNum': 12,
      'transformerLeadsNum': 6,
      'numDiodesVoltageDropInit': 4,
      'devicePulsation': 12
    }, {
      'type': 'Трехфазный с нулевой точкой',
      'phaseDevice': 3,
      'diodesNum': 3,
      'transformerLeadsNum': 4,
      'numDiodesVoltageDropInit': 1,
      'devicePulsation': 3
    }];

  // Удаление схем выпрямителей, не подходящих по количеству фаз
  for (let i = rectificationDevices.length - 1; i >= 0; i--) {
    if (rectificationDevices[i].phaseDevice != phaseScheme) {
      rectificationDevices.splice(i, 1);
    }
  }

  // Формирование массива выпрямителей на основе комбинации схем выпрямления и элементов, использующихся в данной схеме | Удаление диодов с неполным набором параметров
  for (let i = dataBaseElements.diodes.length - 1; i >= 0; i--) {
    if ((dataBaseElements.diodes[i].voltageDrop == null) || dataBaseElements.diodes[i].prrVoltage == null || dataBaseElements.diodes[i].forwardCurrent == null) {
      dataBaseElements.diodes.splice(i, 1);
    } else {
      for (let j = 0; j < rectificationDevices.length; j++) {
        rectifiers.push({
          'diode': dataBaseElements.diodes[i],
          'rectifierType': rectificationDevices[j].type,
          'diodesNum': rectificationDevices[j].diodesNum,
          'numDiodesVoltageDropInit': rectificationDevices[j].numDiodesVoltageDropInit,
          'voltageDropAbsInit': dataBaseElements.diodes[i].voltageDrop,
          'numDiodesVoltageDrop': 1,
          'voltageDropAbs': 1,
          'numDiodesParallel': 1,
          'outputFreq': parameters.f1 * rectificationDevices[j].devicePulsation,
          'transformerLeadsNum': rectificationDevices[j].transformerLeadsNum
        });
      }
    }
  }

  // Удаление выпрямителей, не подходящих по значению обратного напряжения | Последовательное наращивание диодов
  for (let i = rectifiers.length - 1; i >= 0; i--) {
    for (let j = 1; j <= parameters.numDiodesSerial; j++) {
      if ((rectifiers[i].diode.prrVoltage / (1 + parameters.prrVoltageDiodesReserve * 0.01)) < ((parameters.U2 * (1 + parameters.dU2 * 0.01 * 0.5) * 2) / (rectifiers[i].numDiodesVoltageDropInit * j) + rectifiers[i].voltageDropAbsInit)) {
        if (j == parameters.numDiodesSerial) {
          rectifiers.splice(i, 1);
        }
      } else {
        rectifiersTemp[numRectifier] = {};
        rectifiersTemp[numRectifier] = JSON.parse(JSON.stringify(rectifiers[i]));
        rectifiersTemp[numRectifier].prrVoltage = rectifiersTemp[numRectifier].diode.prrVoltage * j;
        rectifiersTemp[numRectifier].numDiodesVoltageDrop = rectifiersTemp[numRectifier].numDiodesVoltageDropInit * j;
        rectifiersTemp[numRectifier].voltageDropAbs = rectifiersTemp[numRectifier].voltageDropAbsInit * rectifiersTemp[numRectifier].numDiodesVoltageDropInit * j;
        numRectifier++;
      }
    }
  }
  numRectifier = 0;
  rectifiers = JSON.parse(JSON.stringify(rectifiersTemp));
  rectifiersTemp = [];

  // Удаление выпрямителей, не подходящих по допустимому прямому току | Параллельное наращивание диодов
  for (let i = rectifiers.length - 1; i >= 0; i--) {
    for (let j = 1; j <= parameters.numDiodesParallel; j++) {
      if ((rectifiers[i].diode.forwardCurrent / (1 + parameters.forwardCurrentDiodesReserve * 0.01)) < (parameters.I2 / j)) {
        if (j == parameters.numDiodesParallel) {
          rectifiers.splice(i, 1);
        }
      } else {
        rectifiersTemp[numRectifier] = {};
        rectifiersTemp[numRectifier] = JSON.parse(JSON.stringify(rectifiers[i]));
        rectifiersTemp[numRectifier].numDiodesParallel = j;
        rectifiersTemp[numRectifier].forwardCurrent = rectifiersTemp[numRectifier].diode.forwardCurrent * j;
        rectifiersTemp[numRectifier].diodesNum =
          rectifiersTemp[numRectifier].numDiodesParallel *
          rectifiersTemp[numRectifier].numDiodesVoltageDrop *
          rectifiersTemp[numRectifier].diodesNum /
          rectifiersTemp[numRectifier].numDiodesVoltageDropInit;
        numRectifier++;
      }
    }
  }
  numRectifier = 0;
  rectifiers = JSON.parse(JSON.stringify(rectifiersTemp));
  rectifiersTemp = [];

  // Расчет параметров диодов, необходимых для вывода пользователю
  for (let i = rectifiers.length - 1; i >= 0; i--) {
    // Тепловые потери выпрямителя
    rectifiers[i].Plosses = +(rectifiers[i].voltageDropAbs * parameters.I2).toFixed(2);
    rectifiers[i].PlossesOfOne = +(rectifiers[i].Plosses / rectifiers[i].diodesNum).toFixed(2);
    // Экономические параметры
    rectifiers[i].price = +(rectifiers[i].diode.price * rectifiers[i].diodesNum).toFixed(2);
    rectifiers[i].lossesCost = +(rectifiers[i].Plosses * parameters.energyPrice).toFixed(2);
    rectifiers[i].totalCosts = +(rectifiers[i].price + rectifiers[i].lossesCost).toFixed(2);
    // Запас обратного напряжения
    rectifiers[i].prrVoltageReserve = +((rectifiers[i].diode.prrVoltage / ((parameters.U2 * (1 + parameters.dU2 * 0.01 * 0.5) * 2) / (rectifiers[i].numDiodesVoltageDrop) + rectifiers[i].voltageDropAbsInit) - 1) * 100).toFixed(0);
    // Запас прямого тока
    rectifiers[i].forwardCurrentReserve = +((rectifiers[i].diode.forwardCurrent / (parameters.I2 / rectifiers[i].numDiodesParallel) - 1) * 100).toFixed(0);
  }

  //console.log('Удаление экономически невыгодных выпрямителей: шаг 1');
  // Удаление экономически невыгодных выпрямителей: шаг 1
  rectifiers.sort((a, b) => a.totalCosts - b.totalCosts);
  for (let i = rectifiers.length - 1; i >= 0; i--) {
    if ((rectifiers[i].prrVoltage <= rectifiers[0].prrVoltage) && (rectifiers[i].totalCosts > rectifiers[0].totalCosts) && (rectifiers[i].forwardCurrent <= rectifiers[0].forwardCurrent)) {
      ////console.log(rectifiers[i].totalCosts, rectifiers[i].forwardCurrent, rectifiers[i].prrVoltage, 'deleted');
      rectifiers.splice(i, 1);
    } else {
      ////console.log(rectifiers[i].totalCosts, rectifiers[i].forwardCurrent, rectifiers[i].prrVoltage);
    }
  }

  //console.log('Удаление экономически невыгодных выпрямителей: шаг 2');
  // Удаление экономически невыгодных выпрямителей: шаг 2
  let oldLength = 0;
  for (let i = 0; i >= 0; i++) {
    if (rectifiers.length != oldLength) {
      oldLength = rectifiers.length;
      for (let j = rectifiers.length - 1; j >= 0; j--) {
        if (j != 0) {
          if (((rectifiers[j].prrVoltage <= rectifiers[j - 1].prrVoltage) && (rectifiers[j].forwardCurrent < rectifiers[j - 1].forwardCurrent)) || ((rectifiers[j].prrVoltage < rectifiers[j - 1].prrVoltage) && (rectifiers[j].forwardCurrent <= rectifiers[j - 1].forwardCurrent))) {
            rectifiers.splice(j, 1);
          }
        }
      }
    } else {
      i = -2;
    }
  }

  // Сортировка массива выпрямителей
  rectifiers.sort(function(a, b) {
    if (a.totalCosts < b.totalCosts) return -1;
    if (a.totalCosts > b.totalCosts) return 1;
    if (a.Plosses < b.Plosses) return -1;
    if (a.Plosses > b.Plosses) return 1;
    return 0;
  });

  console.log('num of rectifiers:', rectifiers.length);

  fs.writeFileSync('./dataBase/test/rectifiers.json', JSON.stringify(rectifiers));

  return rectifiers;
}