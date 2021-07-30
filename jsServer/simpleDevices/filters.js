this.passiveFilters = function(parameters, dataBaseElements) {
  const fs = require("fs");
  let filters = [];
  let filtersFull = [];
  let filtersHalf = [];

  console.time('initial deleting');
  // Удаление конденсаторов с неполным набором параметров
  const capacitors = dataBaseElements.capacitors.filter(item => item.price && item.capacity && item.voltage);
  console.timeEnd('initial deleting'); 

  console.time('creating: step 1');
  // Создание фильтров, подходящих по значению напряжения | Последовательное наращивание конденсаторов
  for (let capacitor of capacitors) {
    for (let numCapsSerial = 1; numCapsSerial <= parameters.numCapsSerial; numCapsSerial++) {
      const filterMaxVoltage = capacitor.voltage * numCapsSerial;
      const requiredVoltageReserve = 1 + parameters.voltageCapsReserve * 0.01;
      const circuitVoltage = parameters.U2 * (1 + parameters.dU2 * 0.01 * 0.5);

      if (filterMaxVoltage >= (circuitVoltage * requiredVoltageReserve)) {
        filters.push({
          capacitor: capacitor,
          numCapsSerial: numCapsSerial,
          voltage: capacitor.voltage * numCapsSerial,
          capacity: capacitor.capacity / numCapsSerial
        });
      }
    }
  }
  console.timeEnd('creating: step 1');

  console.time('creating: step 2');
  // Создание фильтров, подходящих по значению пульсаций (достаточная емкость) | Параллельное наращивание конденсаторов
  for (let filter of filters) {
    for (let numCapsParallel = 1; numCapsParallel <= parameters.numCapsParallel; numCapsParallel++) {
      const filterCapacity = filter.capacity * numCapsParallel;
      const requiredCapacityFull = (3e8 * parameters.I2) / (Math.PI * parameters.U2 * parameters.f1 * 2 * parameters.dU2);
      const requiredCapacityHalf = 2 * requiredCapacityFull;

      // Для мостового выпрямителя
      if (filterCapacity >= requiredCapacityFull) {
        filtersFull.push({
          ...filter,
          numCapsParallel: numCapsParallel,
          capacity: filterCapacity,
          rectifierType: 'fullWave'
        });
      }

      // Для однополупериодного выпрямителя
      if (filterCapacity >= requiredCapacityHalf) {
        filtersHalf.push({
          ...filter,
          numCapsParallel: numCapsParallel,
          capacity: filterCapacity,
          rectifierType: 'halfWave'
        });
      }
    }
  }
  console.timeEnd('creating: step 2');

  filters = {filtersFull, filtersHalf};

  console.time('initial sorting');
  // Сортировка массива фильтров
  for (let filtersType in filters) {
    filters[filtersType].sort(function(a, b) {
      if (a.voltage > b.voltage) return -1;
      if (a.voltage < b.voltage) return 1;
      if (a.capacity > b.capacity) return -1;
      if (a.capacity < b.capacity) return 1;
      return 0;
    });
  }
  console.timeEnd('initial sorting');

  console.time('initial calc params');
  // Расчет параметров фильтров, необходимых для удаления экономически невыгодных вариантов
  for (let filtersType in filters) {
    for (let filter of filters[filtersType]) {
      // Тепловые потери (!!!временно конденсаторы идеальны!!!)
      filter.Plosses = 0;

      // Количество конденсаторов в составе
      filter.numCaps = filter.numCapsSerial * filter.numCapsParallel;

      // Экономические параметры
      filter.price = filter.capacitor.price * filter.numCaps;
      filter.lossesCost = filter.Plosses * parameters.energyPrice;
      filter.totalCosts = filter.price + filter.lossesCost;
    }
  }
  console.timeEnd('initial calc params');

  console.time('fast deleting');
  // Быстрое удаление экономически невыгодных фильтров относительно соседних
  for (let filtersType in filters) {
    let oldLength;
    while (filters[filtersType].length !== oldLength) {
      oldLength = filters[filtersType].length;
      filters[filtersType] = filters[filtersType].filter((item, i, arr) => {
        if (i === 0) return true;

        if (!(
            (item.voltage <= arr[i - 1].voltage && item.capacity <= arr[i - 1].capacity && item.totalCosts > arr[i - 1].totalCosts) ||
            (item.voltage < arr[i - 1].voltage && item.capacity < arr[i - 1].capacity && item.totalCosts === arr[i - 1].totalCosts) ||
            (item.voltage < arr[i - 1].voltage && item.capacity === arr[i - 1].capacity && item.totalCosts === arr[i - 1].totalCosts) ||
            (item.voltage === arr[i - 1].voltage && item.capacity < arr[i - 1].capacity && item.totalCosts === arr[i - 1].totalCosts) ||

            (i !== arr.length - 1 && item.capacity <= arr[i + 1].capacity && item.voltage <= arr[i + 1].voltage && item.totalCosts > arr[i + 1].totalCosts) ||
            (i !== arr.length - 1 && item.capacity === arr[i + 1].capacity && item.voltage < arr[i + 1].voltage && item.totalCosts === arr[i + 1].totalCosts) ||
            (i !== arr.length - 1 && item.capacity < arr[i + 1].capacity && item.voltage === arr[i + 1].voltage && item.totalCosts === arr[i + 1].totalCosts) ||
            (i !== arr.length - 1 && item.capacity < arr[i + 1].capacity && item.voltage < arr[i + 1].voltage && item.totalCosts === arr[i + 1].totalCosts)
        )) {
          return true;
        }
      });
    }
  }
  console.timeEnd('fast deleting');

  console.time('deep deleting');
  // Глубокое удаление экономически невыгодных фильтров относительно всех фильтров массива
  for (let filtersType in filters) {
    filters[filtersType] = filters[filtersType].filter((item, i, arr) => {
      for (let j = 0; j < arr.length; j++) {
        if (
            (item.voltage <= arr[j].voltage && item.capacity <= arr[j].capacity && item.totalCosts > arr[j].totalCosts) ||
            (item.voltage < arr[j].voltage && item.capacity < arr[j].capacity && item.totalCosts === arr[j].totalCosts) ||
            (item.voltage < arr[j].voltage && item.capacity === arr[j].capacity && item.totalCosts === arr[j].totalCosts) ||
            (item.voltage === arr[j].voltage && item.capacity < arr[j].capacity && item.totalCosts === arr[j].totalCosts)

          ) {
          return false;
        }
      }

      return true;
    });
  }
  console.timeEnd('deep deleting');

  console.time('final sorting');
  // Конечная сортировка массива фильтров для вывода пользователю в удобном виде
  for (let filtersType in filters) {
    filters[filtersType].sort(function(a, b) {
      if (a.totalCosts < b.totalCosts) return -1;
      if (a.totalCosts > b.totalCosts) return 1;
      if (a.capacity > b.capacity) return -1;
      if (a.capacity < b.capacity) return 1;
      if (a.voltage > b.voltage) return -1;
      if (a.voltage < b.voltage) return 1;
      return 0;
    });
  }
  console.timeEnd('final sorting');

  console.time('final calc params');
  // Расчет параметров фильтров, необходимых для удаления экономически невыгодных вариантов
  for (let filtersType in filters) {
    for (let filter of filters[filtersType]) {
      // Округление значения емкости
      filter.capacity = +filter.capacity.toFixed(0);

      // Экономические параметры
      filter.price = +filter.price.toFixed(2);
      filter.lossesCost = +(filter.lossesCost).toFixed(2);
      filter.totalCosts = +(filter.totalCosts).toFixed(2);

      // Запас по напряжению
      filter.voltageReserve = +(((filter.capacitor.voltage * filter.numCapsSerial) / (parameters.U2 * (1 + parameters.dU2 * 0.01 * 0.5)) - 1) * 100).toFixed(0);

      // Пульсации напряжения
      const pulsatingVoltage = +((3e8 * parameters.I2) / (Math.PI * parameters.U2 * parameters.f1 * 2 * filter.capacity)).toFixed(2);
      if (filter.rectifierType == 'fullWave') {
        filter.pulsatingVoltageReal = pulsatingVoltage;
      } else if (filter.rectifierType == 'halfWave') {
        filter.pulsatingVoltageReal = pulsatingVoltage * 2;
      }
    }
  }
  console.timeEnd('final calc params');

  console.log('num of filters:', filters.filtersFull.length, filters.filtersHalf.length);

  fs.writeFileSync('./dataBase/test/filters.json', JSON.stringify(filters));

  return filters;
}


// console.time('compare');
// let same = 0;
// for (let i = 0; i < filters.filtersFull.length; i++) {
//   console.log(i, filters.filtersFull.length);
//   filters.filtersFull[i].rectifierType = 'halfWave';
//   filters.filtersFull[i].pulsatingVoltageReal = 0;
//   for (let j = 0; j < filters.filtersHalf.length; j++) {
//     filters.filtersHalf[j].pulsatingVoltageReal = 0;
//     if (i === 11 && j === 0) {
//       console.log(filters.filtersFull[i]);
//       console.log(filters.filtersHalf[j]);
//     }
//     if (JSON.stringify(filters.filtersFull[i]) === JSON.stringify(filters.filtersHalf[j])) {
//       same++;
//     }
//   }
// }
// console.timeEnd('compare');
// console.log(same);