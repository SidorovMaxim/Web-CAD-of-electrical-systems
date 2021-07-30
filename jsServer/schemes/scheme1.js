let rectifiers = [];
let filters = [];
let transformers = [];

const createList = {
  rectifiers: function(rectifiers) {
    // Список выпрямителей
    let rectifiersList = `<select class='rectifier' onchange='changeSimilarDeviceBlock(this.className, this.value)'><option style='font-size:14px;' value='-1'>Пожалуйста, выберите выпрямитель</option>`;
    for (let i = 0; i < rectifiers.length; i++) {
      let listTemp = `№${i}&nbsp;|&nbsp;Цена: ${rectifiers[i].price}руб.` +
        `&nbsp;|&nbsp;Экспл. затраты: ${rectifiers[i].lossesCost}руб.` +
        `&nbsp;|&nbsp;Сумм. затраты: ${rectifiers[i].totalCosts}руб.` +
        `&nbsp;|&nbsp;Тепл. потери: ${rectifiers[i].Plosses}Вт` +
        `&nbsp;|&nbsp;Запас по току: ${rectifiers[i].forwardCurrentReserve}%` +
        `&nbsp;|&nbsp;Запас по напр.: ${rectifiers[i].prrVoltageReserve}%` +
        `&nbsp;|&nbsp;${rectifiers[i].rectifierType}`;
      rectifiersList = rectifiersList + `<option style='font-size:14px;' value='${i}'>${listTemp}</option>`;
    }
    return rectifiersList += `</select>`;
  },

  filters: function(filters, type) {
    // Список фильтров
    filters = type === 'full' ? filters.filtersFull : filters.filtersHalf;

    let filtersList = `<select class='filter' onchange='changeSimilarDeviceBlock(this.className, this.value)'><option style='font-size:14px;' value='-1'>Пожалуйста, выберите фильтр</option>`;
    for (let i = 0; i < filters.length; i++) {
      let listTemp = `№${i}&nbsp;|&nbsp;Цена: ${filters[i].price}руб.` +
        `&nbsp;|&nbsp;Емкость: ${filters[i].capacity}мкФ` +
        `&nbsp;|&nbsp;Напряжение: ${filters[i].voltage}В` +
        `&nbsp;|&nbsp;Пульсации напр. на нагр.: ${filters[i].pulsatingVoltageReal}%` +
        `&nbsp;|&nbsp;Производитель: ${filters[i].capacitor.producer}`;
      filtersList += `<option style='font-size:14px;' value='${i}'>${listTemp}</option>`;
    }
    return filtersList += `</select>`;
  },

  transformers: function(transformers) {
    // Список трансформаторов
    let transformersList = `<select class='transformer' onchange='changeSimilarDeviceBlock(this.className, this.value)'><option style='font-size:14px;' value='-1'>Пожалуйста, выберите трансформатор</option>`;
    for (let i = 0; i < transformers.length; i++) {
      let listTemp = `№${i}&nbsp;|&nbsp;Цена: ${transformers[i].price}руб.` +
        `&nbsp;|&nbsp;Экспл. затраты: ${transformers[i].lossesCost}руб.` +
        `&nbsp;|&nbsp;Сумм. затраты: ${transformers[i].totalCosts}руб.` +
        `&nbsp;|&nbsp;Тепл. потери: ${transformers[i].Plosses}Вт` +
        `&nbsp;|&nbsp;Раб. темп.: ${transformers[i].T}&deg;C` +
        `&nbsp;|&nbsp;Масса: ${+(transformers[i].mass * 1000).toFixed(1)}г`;
      transformersList = transformersList + `<option style='font-size:14px;' value='${i}'>${listTemp}</option>`;
    }
    return transformersList += `</select>`;
  }
};

this.stage1 = function(parameters, dataBaseElements) {
  parameters.energyPrice = parameters.hoursPerYear * parameters.workingYears * parameters.electricityCost / 1000;
  const phaseScheme = 1;

  console.log('start of calculation:\n');

  console.time('rectifiers done');
  console.log('rectifiers started:');
  // 1 шаг: Расчет выпрямителей
  rectifiers = require('../simpleDevices/rectifiers');
  rectifiers = rectifiers.passiveDiodes(parameters, dataBaseElements, phaseScheme);
  console.timeEnd('rectifiers done');
  console.log('\n');

  console.time('filters done');
  console.log('filters started:');
  // 2 шаг: Расчет фильтров
  filters = require('../simpleDevices/filters');
  filters = filters.passiveFilters(parameters, dataBaseElements);
  console.timeEnd('filters done');
  console.log('\n');

  console.time('transformers done');
  console.log('transformers started:');
  // 3 шаг: Расчет трансформаторов
  transformers = require('../simpleDevices/transformers');
  transformers = transformers.passive(parameters, dataBaseElements);
  console.timeEnd('transformers done');
  console.log('\n');

  console.time('other');
  // 4 шаг: Указание компонентного состава проектируемого устройства 
  let simpleDevices = [transformers, rectifiers, filters];

  // 5 шаг: Проверка массивов простейших устройств
  let error = false;
  for (let simpleDevice of simpleDevices) {
    if (simpleDevice.length === 0) {
      error = true;
      break;
    }
  }

  let devices;
  if (!error) {
    // 7 шаг: Удаление неприменимых блоков выпрямителей в связи отсутствием соотвествующих фильтров
    if (filters.filtersHalf.length === 0) {
      for (let i = rectifiers.length - 1; i >= 0; i--) {
        if (rectifiers[i].rectifierType == 'Однополупериодный (четвертьмост)') {
          rectifiers.splice(i, 1);
        }
      }
    }
    if (filters.filtersFull.length === 0) {
      for (let i = rectifiers.length - 1; i >= 0; i--) {
        if (rectifiers[i].rectifierType == 'Полный мост (Гретца)') {
          rectifiers.splice(i, 1);
        }
      }
    }

    // 8 шаг: Присвоение эталонному устройству простейших устройств
    let bestDevice = {
      'rectifier': rectifiers[0],
      'filter': (rectifiers[0].rectifierType == 'Полный мост (Гретца)') ? filters.filtersFull[0] :
                (rectifiers[0].rectifierType == 'Однополупериодный (четвертьмост)') ? filters.filtersHalf[0] :
                undefined,
      'transformer': transformers[0]
    };


    // 9 шаг: Расчет технических параметров наиболее выгодного устройства
    bestDevice.Plosses = +(bestDevice.rectifier.Plosses + bestDevice.filter.Plosses + bestDevice.transformer.Plosses).toFixed(2);
    bestDevice.Pout = +(parameters.I2 * parameters.U2).toFixed(2);
    bestDevice.Pin = +(bestDevice.Pout + bestDevice.Plosses).toFixed(2);
    bestDevice.efficiency = +(100 * bestDevice.Pout / bestDevice.Pin).toFixed(2);

    // 10 шаг: Расчет экономических параметров наиболее выгодного устройства
    bestDevice.price = +(bestDevice.rectifier.price + bestDevice.filter.price + bestDevice.transformer.price).toFixed(1);
    bestDevice.lossesCost = +(bestDevice.rectifier.lossesCost + bestDevice.filter.lossesCost + bestDevice.transformer.lossesCost).toFixed(1);
    bestDevice.totalCosts = +(bestDevice.rectifier.totalCosts + bestDevice.filter.totalCosts + bestDevice.transformer.totalCosts).toFixed(1);

    // 11 шаг: Удаление дорогих устройств
    const costEffective = bestDevice.totalCosts * 2;
    // Удаление дорогих позиций компонентных блоков
    simpleDevices.forEach(function(item, j) {
      for (let i = item.length - 1; i >= 0; i--) {
        if (item[i].totalCosts > costEffective) {
          item.splice(i, 1);
        }
      }
    });
    // Удаление дорогих фильтров
    for (let i = filters.filtersFull.length - 1; i >= 0; i--) {
      if (filters.filtersFull[i].totalCosts > costEffective) {
        filters.filtersFull.splice(i, 1);
      }
    }
    for (let i = filters.filtersHalf.length - 1; i >= 0; i--) {
      if (filters.filtersHalf[i].totalCosts > costEffective) {
        filters.filtersHalf.splice(i, 1);
      }
    }

    // Описание эталонного устройства
    bestDevice.description = `<a style='line-height:30px; border-radius:5px; border: 3px solid rgb(128, 255, 128);'>&nbsp;Наименьшие суммарные затраты&nbsp;</a><br><a class='annotation'>"Данное устройство является наиболее оптимальным с точки зрения алгоритма" - это решение вынесено на основе заданных технических и экономических характеристик проектируемого устройства, а также параметров, полученных в результате математических расчетов. Дальнейшее описание параметров аналогичных устройств производится относительно параметров данного устройства.</a><br>`;

    // 12 шаг: Создание списков простейших устройств
    const lists = [
      createList.rectifiers(rectifiers),
      createList.filters(filters, 'full'),
      createList.filters(filters, 'half'),
      createList.transformers(transformers)
    ];
    
    devices = [
      bestDevice,
      ...lists
    ];
  }
  console.timeEnd('other');
  console.log('\n');

  return devices;
}



this.stage2 = function(parameters, simpleDevicesNum, bestDevice) {
  simpleDevicesNum.transformer = simpleDevicesNum.transformer;
  simpleDevicesNum.rectifier = simpleDevicesNum.rectifier;
  simpleDevicesNum.filter = simpleDevicesNum.filter;

  // 1 шаг: Проверка выбранных простейших устройств аналога
  let error = false;
  for (key in simpleDevicesNum) {
    if (simpleDevicesNum[key] === undefined) {
      error = true;
      break;
    }
  }

  // 2 шаг: Присвоение простеших устройств аналогу в соотвествии с выбором пользователя
  const rectifierType = simpleDevicesNum.rectifier && rectifiers[simpleDevicesNum.rectifier].rectifierType;
  let similarDevice = {
    'rectifier': rectifiers[simpleDevicesNum.rectifier],
    'filter': (rectifierType === 'Полный мост (Гретца)') ? filters.filtersFull[simpleDevicesNum.filter] :
              (rectifierType === 'Однополупериодный (четвертьмост)') ? filters.filtersHalf[simpleDevicesNum.filter] :
              undefined,
    'transformer': transformers[simpleDevicesNum.transformer]
  };

  if (!error) {
    // 3 шаг: Расчет технических параметров аналогичного устройства
    similarDevice.Plosses = +(similarDevice.rectifier.Plosses + similarDevice.filter.Plosses + similarDevice.transformer.Plosses).toFixed(2);
    similarDevice.Pout = +(parameters.I2 * parameters.U2).toFixed(2);
    similarDevice.Pin = +(similarDevice.Pout + similarDevice.Plosses).toFixed(2);
    similarDevice.efficiency = +(100 * similarDevice.Pout / similarDevice.Pin).toFixed(2);

    // 4 шаг: Расчет экономических параметров аналогичного устройства
    similarDevice.price = +(similarDevice.rectifier.price + similarDevice.filter.price + similarDevice.transformer.price).toFixed(1);
    similarDevice.lossesCost = +(similarDevice.rectifier.lossesCost + similarDevice.filter.lossesCost + similarDevice.transformer.lossesCost).toFixed(1);
    similarDevice.totalCosts = +(similarDevice.rectifier.totalCosts + similarDevice.filter.totalCosts + similarDevice.transformer.totalCosts).toFixed(1);

    // 5 шаг: Вычисление разницы между параметрами аналога и лучшего предложения
    let paramsDifferenceDevices = [
      ['device', 'price'],
      ['device', 'lossesCost'],
      ['device', 'totalCosts'],
      ['device', 'efficiency'],
      ['filter', 'pulsatingVoltageReal'],
      ['filter', 'voltageReserve'],
      ['rectifier', 'prrVoltageReserve'],
      ['rectifier', 'forwardCurrentReserve']
    ];

    similarDevice['difference'] = {};
    similarDevice['difference']['device'] = {};
    similarDevice['difference']['filter'] = {};
    similarDevice['difference']['rectifier'] = {};

    paramsDifferenceDevices.forEach(function(item, j) {
      if (item[0] == 'device') {
        if (item[1] == 'efficiency') {
          similarDevice['difference'][item[0]][item[1]] = +(similarDevice[item[1]] - bestDevice[item[1]]).toFixed(2);
        } else {
          similarDevice['difference'][item[0]][item[1]] = +(similarDevice[item[1]] - bestDevice[item[1]]).toFixed(2);
        }
      } else if (item[1] == 'pulsatingVoltageReal') {
        similarDevice['difference'][item[0]][item[1]] = +(similarDevice[item[0]][item[1]] - bestDevice[item[0]][item[1]]).toFixed(2);
      } else {
        similarDevice['difference'][item[0]][item[1]] = +(similarDevice[item[0]][item[1]] - bestDevice[item[0]][item[1]]).toFixed(2);
      }
      if (similarDevice['difference'][item[0]][item[1]] == 0) {
        similarDevice['difference'][item[0]][item[1]] = `равны`;
      } else {
        if (String(similarDevice['difference'][item[0]][item[1]]).indexOf('-') == -1) {
          similarDevice['difference'][item[0]][item[1]] = `больше на ${similarDevice['difference'][item[0]][item[1]]}`;
        } else {
          similarDevice['difference'][item[0]][item[1]] = (`меньше на ${similarDevice['difference'][item[0]][item[1]]}`).replace('-', '');
        }
      }
    });

    // 6 шаг: Присвоение цвета параметрам аналогичного устройств
    paramsDifferenceDevices.forEach(function(item, j) {
      if ((item[1] == 'price') || (item[1] == 'lossesCost') || (item[1] == 'totalCosts') || (item[1] == 'pulsatingVoltageReal')) {
        if (similarDevice['difference'][item[0]][item[1]].indexOf('больше') == -1) {
          similarDevice['difference'][item[0]][item[1] + 'Color'] = `rgb(128, 255, 128)`;
        } else if (similarDevice['difference'][item[0]][item[1]].indexOf('меньше') == -1) {
          similarDevice['difference'][item[0]][item[1] + 'Color'] = `rgb(255, 128, 128)`;
        } else {}
      } else {
        if (similarDevice['difference'][item[0]][item[1]].indexOf('больше') != -1) {
          similarDevice['difference'][item[0]][item[1] + 'Color'] = `rgb(128, 255, 128)`;
        } else if (similarDevice['difference'][item[0]][item[1]].indexOf('меньше') != -1) {
          similarDevice['difference'][item[0]][item[1] + 'Color'] = `rgb(255, 128, 128)`;
        } else {}
      }
    });

    // 7 шаг: Описание аналога
    similarDevice.difference.device.price = `Цена ${similarDevice.difference.device.price} руб.`;
    similarDevice.difference.device.lossesCost = `Экспл. затраты ${similarDevice.difference.device.lossesCost} руб.`;
    similarDevice.difference.device.totalCosts = `Суммарные затраты ${similarDevice.difference.device.totalCosts} руб.`;
    similarDevice.difference.device.efficiency = `КПД устройства ${similarDevice.difference.device.efficiency} %`;
    similarDevice.difference.filter.pulsatingVoltageReal = `Двойная ампл. пульс. напр. на нагр. ${similarDevice.difference.filter.pulsatingVoltageReal} %`;
    similarDevice.difference.filter.voltageReserve = `Запас конденсаторов по напряжению ${similarDevice.difference.filter.voltageReserve} %`;
    similarDevice.difference.rectifier.forwardCurrentReserve = `Запас диодов по току ${similarDevice.difference.rectifier.forwardCurrentReserve} %`;
    similarDevice.difference.rectifier.prrVoltageReserve = `Запас диодов по обратному напр. ${similarDevice.difference.rectifier.prrVoltageReserve} %`;

    similarDevice.description = `<a style='font-weight:bold; font-size:20px'>Отличающиеся параметры:</a><br>`;
    similarDevice.advantages = '';
    similarDevice.disadvantages = '';
    paramsDifferenceDevices.forEach(function(item, j) {
      if (similarDevice['difference'][item[0]][item[1]].indexOf('равны') == -1) {
        if (similarDevice['difference'][item[0]][item[1] + 'Color'] == `rgb(128, 255, 128)`) {
          similarDevice.advantages += `<div style='margin-bottom:5px;'><a style='border-radius:8px; border: 3px solid ${similarDevice.difference[item[0]][item[1] + 'Color']};'>&nbsp;${similarDevice.difference[item[0]][item[1]]}&nbsp;</a></div>`;
        } else {
          similarDevice.disadvantages += `<div style='margin-bottom:5px;'><a style='border-radius:8px; border: 3px solid ${similarDevice.difference[item[0]][item[1] + 'Color']};'>&nbsp;${similarDevice.difference[item[0]][item[1]]}&nbsp;</a></div>`;
        }
      }
    });
  }

  let devices = [similarDevice];
  return devices;
}
