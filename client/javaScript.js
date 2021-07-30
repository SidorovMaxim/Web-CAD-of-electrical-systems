let scheme = 0;
let form = 0;

let parameters = {};
let Ku1;
let Kf1;

let bestDevice = {};
let similarDevice = {}
let lists = {};
let simpleDevices = {};
let oldRectifierName;

(function init() {
  selectScheme();
  selectForm();
})();


// Функция выбора нужной электротехнической схемы
function selectScheme(turn) {
  if (scheme === 0) {
    turn = 1;
  } else {
    document.getElementById('schemeButton' + scheme).classList = 'schemeButton';
  }
  document.getElementById('schemeButton' + turn).classList = 'schemeButtonActive';

  $('#parametersTable').replaceWith(
    "<table id='parametersTable' align='center' cellpadding='5' class='table'>" +
    "<tr>" +
    "<td colspan='8' align='center' class='title1'> Введите технические параметры </td>" +
    "</tr>" +
    "<tr align='center'>" +
    "<td width='400px' class='title2' id='parametersTitle1'> Амплитудное значение фазного питающего напряжения, U<ni class='numIndex'>ФП</ni> </td>" +
    "<td width='400px' class='title2' id='parametersTitle2'> Частота питающего напряжения, f<ni class='numIndex'>П</ni> </td>" +
    "<td width='400px' class='title2' id='parametersTitle3' colspan='2'> Форма питающего напряжения </td>" +
    "</tr>" +
    "<tr align='center'>" +
    "<td><textarea id='U1' maxlength='7' required rows='1' cols='8' class='param1'>310</textarea><pp class='title3'> В <pp></td>" +
    "<td id='f1cell'><textarea id='f1' maxlength='7' required rows='1' cols='8' class='param1'>50000</textarea><pp class='title3'> Гц <pp></td>" +
    "<td><button class='formButton' id='formButton1' onclick='selectForm(1)'><img class='formImage' id='formImage1' src='images/FOV/FOV1.png'></button></td>" +
    "<td><button class='formButton' id='formButton4' onclick='selectForm(4)'><img class='formImage' id='formImage4' src='images/FOV/FOV4.png'></button></td>" +
    "</tr>" +
    "<tr align='center'>" +
    "<td width='400px' class='title2' id='parametersTitle4'> Напряжение на нагрузке (RMS), U<ni class='numIndex'>Н</ni> </td>" +
    "<td width='400px' class='title2' id='parametersTitle5'> Суммарный ток нагрузки (RMS), I<ni class='numIndex'>Н</ni> </td>" +
    "<td width='400px' class='title2' id='parametersTitle6' colspan='2'> Допустимая двойная амплитуда пульсаций напряжения на нагрузке, <ni class='numIndex'>&Delta;</ni>U<ni class='numIndex'>Н</ni> </td>" +
    "</tr>" +
    "<tr align='center'>" +
    "<td><textarea id='U2' maxlength='7' required rows='1' cols='8' class='param1'>48</textarea><pp class='title3'> В <pp></td>" +
    "<td><textarea id='I2' maxlength='7' required rows='1' cols='8' class='param1'>200</textarea><pp class='title3'> А <pp></td>" +
    "<td colspan='6'><textarea id='dU2' maxlength='3' required rows='1' cols='4' class='param1'>1</textarea><pp class='title3'> % <pp></td>" +
    "</tr>" +
    "</table>");
  scheme = turn;
}

// Функция выбора нужной формы напряжения
function selectForm(turn) {
  if (form === 0) {
    turn = 4;
  } else {
    document.getElementById('formButton' + form).classList = 'formButton';
    document.getElementById('formImage' + form).classList = 'formImage';
  }
  document.getElementById('formButton' + turn).classList = 'formButtonActive';
  document.getElementById('formImage' + turn).classList = 'formImageActive';
  form = turn;
  if (form === 1) {
    Kf1 = 1.111;
    Ku1 = 0.707;
  }
  if (form === 4) {
    Kf1 = 1;
    Ku1 = 1;
  }
}

// Запустить расчет
async function runCalculation() {
  parameters = getParameters();

  const devices = await getDevices();
  if (devices) [bestDevice, lists.rectifier, lists.filterFull, lists.filterHalf, lists.transformer] = devices;

  createBestDeviceBlock(bestDevice);
  createSimilarDeviceBlock(lists);
}

// Опрос полей параметров
function getParameters() {
  return {
    scheme: scheme,
    U1: $('#U1').val(),
    f1: $('#f1').val(),
    Kf1: Kf1,
    Ku1: Ku1,
    dU1: $('#dU1').val(),
    U1rms: $('#U1').val() * Ku1,
    U2: $('#U2').val(),
    I2: $('#I2').val(),
    f2: $('#f2').val(),
    Kf2: $('#Kf2').val(),
    dU2: $('#dU2').val(),
    numDiodesParallel: $('#numDiodesParallel').val(),
    numDiodesSerial: $('#numDiodesSerial').val(),
    numCapsParallel: $('#numCapsParallel').val(),
    numCapsSerial: $('#numCapsSerial').val(),
    prrVoltageDiodesReserve: $('#prrVoltageDiodesReserve').val(),
    forwardCurrentDiodesReserve: $('#forwardCurrentDiodesReserve').val(),
    voltageCapsReserve: $('#voltageCapsReserve').val(),
    powerTransformersReserve: $('#powerTransformersReserve').val(),
    hoursPerYear: $('#hoursPerYear').val(),
    workingYears: $('#workingYears').val(),
    electricityCost: $('#electricityCost').val(),
    ambientTemperature: $('#ambientTemperature').val(),
    materialPrefs: $('#materialPrefs').val()
  };
}

// Отправка парметров проектируемого устройства, получение готового эталонного устройства с набором аналогичных узлов
function getDevices() {

  // Экран ожидания расчета
  $('body').attr('class', 'bodyFixed');
  $('#schemeSelection').replaceWith('');
  $('#parametersTable').replaceWith('');
  $('#parametersTable2').replaceWith('');
  $('#parametersTable3').replaceWith('');
  $('#parametersTable4').replaceWith('');
  $('#submitTable').replaceWith(
    `<div align='center' id='inProgress' width='1250px' height='1000px' class='title6'>` +
      `<img src='loadBlack.svg'><br>Идёт расчет, пожалуйста, подождите` +
    `</div>`
  );

  // Запрос на получение устройств
  console.time('calculation');
  return new Promise(resolve => {
    $.ajax({
      url: "/devices",
      method: "POST",
      data: {parameters},
      success: function(response) {
        console.timeEnd('calculation');
        resolve(response);
      }
    });
  });

}

// Создать блок эталлоного устройства
function createBestDeviceBlock(bestDevice) {
  $('#inProgress').replaceWith(
    `<div id='bestDeviceBlock'></div>` +
    `<div id='similarDeviceBlock'></div>`
  );

  if (bestDevice) {
    const bestDeviceBlock =
      `<div id='bestDeviceBlock'>` +
      `<table align='center' cellpadding='5px' class='tableDevices' style='border-spacing:6px;'>` +

      `<tr class='title4'>` +
      `<td style='font-size:25px; font-style: italic;' align='center' width='1250px' colspan='6'>&nbsp;Эталонное устройство</td>` +
      `</tr>` +

      `<tr style='vertical-align:top;' class='title2'>` +
      `<td colspan='5' align="justify">` +
      `<a>${bestDevice.description}</a>` +
      `</td>` +
      `</tr>` +

      `<tr class='title2'>` +
      `<td align='left' rowspan='2' width='36%' height='100px'>` +
      `<a style='font-weight:bold; font-size:20px;'>Параметры устройства:</a><br>` +
      `Размах пульсаций напряжения на нагрузке: ${bestDevice.filter.pulsatingVoltageReal} %<br>` +
      `Потребляемая мощность: ${bestDevice.Pin} Вт<br>` +
      `Питающий ток: ${+(bestDevice.Pin / parameters.U1rms).toFixed(2)} А<br>` +
      `Питающее напряжение: ${parameters.U1rms} В<br>` +
      `Полезная мощность: ${bestDevice.Pout} Вт<br>` +
      `Ток нагрузки: ${parameters.I2} А<br>` +
      `Напряжение на нагрузке: ${parameters.U2} В<br>` +
      `Тепловые потери: ${bestDevice.Plosses} Вт<br>` +
      `КПД: ${bestDevice.efficiency} %<br>` +
      `</td>` +

      `<td align='center' rowspan='2' width='16%'>` +
      `<a style='line-height:30px; font-weight:bold;'>Схема устройства:</a><br>` +
      `<img src='images/schemes/${bestDevice.rectifier.rectifierType}.jpg' class='finalSchemeImage'>` +
      `</td>` +

      `<td align='center' width='16%'><a style='font-weight:bold;'>Цена</a></td>` +
      `<td align='center' width='16%'><a style='font-weight:bold;'>Затраты на<br>потери э/э<br>в течение ${parameters.workingYears} лет</a></td>` +
      `<td align='center' width='16%'><a style='font-weight:bold;'>Суммарные затраты<br>за ${parameters.workingYears} года/лет</a></td>` +
      `</tr>` +

      `<tr class='title2'>` +
      `<td style='font-weight:bold; font-size:24px' align='center'>` +
      `${+bestDevice.price.toFixed(0)} руб. <br>` +
      `</td>` +
      `<td style='font-weight:bold; font-size:24px' align='center'>` +
      `${+bestDevice.lossesCost.toFixed(0)} руб.<br>` +
      `</td>` +
      `<td style='font-weight:bold; font-size:24px' align='center'>` +
      `${+bestDevice.totalCosts.toFixed(0)} руб.<br>` +
      `</td>` +
      `</tr>` +
      `</table>` +



      `<table align='center' cellpadding='5px' class='tableDevices' style='border-spacing:6px;'>` +
      `<tr style='vertical-align:top;' class='title2' align='left'>` +
      `<td colspan='4'>` +
      `<a style='font-weight:bold; font-size:20px'>Трансформатор:</a><br>` +
      `</td>` +
      `</tr>` +

      `<tr style='vertical-align:top;' class='title2'>` +
      `<td width='28%' align='left'>` +
      `Цена: ${bestDevice.transformer.price} руб.<br>` +
      `Эксплуатационные затраты: ${bestDevice.transformer.lossesCost} руб.<br>` +
      `Суммарные затраты: ${bestDevice.transformer.totalCosts} руб.<br>` +
      `Тепловые потери: ${bestDevice.transformer.Plosses} Вт<br>` +
      `Рабочая температура: ${bestDevice.transformer.T} &deg;C<br>` +
      `Макс. допустимая температура: ${bestDevice.transformer.Tmax} &deg;C<br>` +
      `Рабочая магнитная индукция: ${bestDevice.transformer.Bm} Тл<br>` +
      `Коэффициент трансформации: ${bestDevice.transformer.K12}<br>` +
      `Коэффициент окна: ${bestDevice.transformer.Kwindow}<br>` +
      `Масса: ${+(bestDevice.transformer.mass * 1000).toFixed(1)} г<br>` +
      `</td>` +

      `<td width='24%' align='left'>` +
      `<a style='font-weight:bold;'>Магнитопровод:</a><br>` +
      `Производитель: ${bestDevice.transformer.core.producer}<br>` +
      `Форма: ${bestDevice.transformer.core.form}<br>` +
      `Размеры: ${bestDevice.transformer.core.OD * 1000}x${bestDevice.transformer.core.ID * 1000}x${bestDevice.transformer.core.h * 1000} мм<br>` +
      `Материал: ${bestDevice.transformer.core.material}<br>` +
      `Цена: ${bestDevice.transformer.core.price} руб.<br>` +
      `<a href='${bestDevice.transformer.core.href}' target='_blank'>Ссылка на товар<br></a>` +
      `</td>` +

      `<td width='24%' align='left'>` +
      `<a style='font-weight:bold;'>Первичная обмотка:</a><br>` +
      `Напряжение с уч. стаб.: ${bestDevice.transformer.winding1.UrmsReal} В<br>` +
      `Число витков: ${bestDevice.transformer.winding1.w}<br>` +
      `Число паралл. проводников: ${bestDevice.transformer.winding1.parallelWires}<br>` +
      `Общая длина: ${+(bestDevice.transformer.winding1.l * bestDevice.transformer.winding1.parallelWires).toFixed(3)} м<br>` +
      `Цена: ${bestDevice.transformer.winding1.price} руб.<br><br>` +
      `Провод: ${bestDevice.transformer.winding1.wire.name} ${+(bestDevice.transformer.winding1.wire.d * 1000).toFixed(2)}мм<br>` +
      `<a href='${bestDevice.transformer.winding1.wire.href}' target='_blank'>Ссылка на товар<br></a>` +

      `</td>` +

      `<td width='24%' align='left'>` +
      `<a style='font-weight:bold;'>Вторичная обмотка:</a><br>` +
      `Напряжение без стаб.: ${bestDevice.transformer.winding2.UrmsReal} В<br>` +
      `Число витков: ${bestDevice.transformer.winding2.w}<br>` +
      `Число паралл. проводников: ${bestDevice.transformer.winding2.parallelWires}<br>` +
      `Общая длина: ${+(bestDevice.transformer.winding2.l * bestDevice.transformer.winding2.parallelWires).toFixed(3)} м<br>` +
      `Цена: ${bestDevice.transformer.winding2.price} руб.<br><br>` +
      `Провод: ${bestDevice.transformer.winding2.wire.name} ${+(bestDevice.transformer.winding2.wire.d * 1000).toFixed(2)}мм<br>` +
      `<a href='${bestDevice.transformer.winding2.wire.href}' target='_blank'>Ссылка на товар<br></a>` +
      `</td>` +
      `</tr>` +
      `</table>` +



      `<table align='center' cellpadding='5px' class='tableDevices' style='border-spacing:6px;'>` +
      `<tr style='vertical-align:top;' class='title2' align='left'>` +
      `<td colspan='3'>` +
      `<a style='font-weight:bold; font-size:20px'>Выпрямитель:</a><br>` +
      `</td>` +
      `</tr>` +

      `<tr style='vertical-align:top;' class='title2'>` +
      `<td width='33%' align='left'>` +
      `Схема: ${bestDevice.rectifier.rectifierType}<br>` +
      `Цена: ${bestDevice.rectifier.price} руб.<br>` +
      `Эксплуатационные затраты: ${bestDevice.rectifier.lossesCost} руб.<br>` +
      `Суммарные затраты: ${bestDevice.rectifier.totalCosts} руб.<br>` +
      `Тепловые потери: ${bestDevice.rectifier.Plosses} Вт<br>` +
      `Макс. прямой ток: ${bestDevice.rectifier.forwardCurrent} А<br>` +
      `Макс. обратное напряжение: ${bestDevice.rectifier.prrVoltage} В<br>` +
      `</td>` +

      `<td width='33%' align='left'>` +
      `<a style='font-weight:bold;'>Параметры диода:</a><br>` +
      `Наименование: ${bestDevice.rectifier.diode.name}<br>` +
      `Параметры: ${bestDevice.rectifier.diode.voltageDrop}В ${bestDevice.rectifier.diode.forwardCurrent}А ${bestDevice.rectifier.diode.prrVoltage}В<br>` +
      `Рассеиваемая мощность: ${bestDevice.rectifier.PlossesOfOne} Вт<br>` +
      `Запас по напряжению: ${bestDevice.rectifier.prrVoltageReserve} %<br>` +
      `Запас по току: ${bestDevice.rectifier.forwardCurrentReserve} %<br>` +
      `Цена: ${bestDevice.rectifier.diode.price} руб.<br>` +
      `<a href='${bestDevice.rectifier.diode.href}' target='_blank'>Ссылка на товар<br></a>` +
      `</td>` +

      `<td width='33%' align='left'>` +
      `<a style='font-weight:bold;'>Количество диодов:</a><br>` +
      `${bestDevice.rectifier.numDiodesVoltageDrop / bestDevice.rectifier.numDiodesVoltageDropInit} последовательно<br>` +
      `${bestDevice.rectifier.numDiodesParallel} параллельно<br> ` +
      `Всего ${bestDevice.rectifier.diodesNum} шт.` +
      `</td>` +
      `</tr>` +
      `</table>` +


      `<table align='center' cellpadding='5px' class='tableDevices' style='border-spacing:6px;'>` +
      `<tr style='vertical-align:top;' class='title2' align='left'>` +
      `<td colspan='3'>` +
      `<a style='font-weight:bold; font-size:20px'>Фильтр:</a><br>` +
      `</td>` +
      `</tr>` +

      `<tr style='vertical-align:top;' class='title2'>` +
      `<td width='33%' align='left'>` +
      `<a style='font-weight:bold;'>Электролитический конденсатор:</a><br>` +
      `Цена: ${bestDevice.filter.price} руб.<br>` +
      `Суммарная емкость: ${bestDevice.filter.capacity} мкФ<br>` +
      `Макс. рабочее напряжение: ${bestDevice.filter.voltage} В<br>` +
      `</td>` +

      `<td width='33%' align='left'>` +
      `<a style='font-weight:bold;'>Параметры конденсатора:</a><br>` +
      `Производитель: ${bestDevice.filter.capacitor.producer}<br>` +
      `Емкость: ${bestDevice.filter.capacitor.capacity} мкФ<br>` +
      `Макс. рабочее напряжение: ${bestDevice.filter.capacitor.voltage} В<br>` +
      `Запас по напряжению: ${bestDevice.filter.voltageReserve} %<br>` +
      `Цена: ${bestDevice.filter.capacitor.price} руб.<br>` +
      `<a href='${bestDevice.filter.capacitor.href}' target='_blank'>Ссылка на товар<br></a>` +
      `</td>` +

      `<td width='33%' align='left'>` +
      `<a style='font-weight:bold;'>Количество конденсаторов:</a><br>` +
      `${bestDevice.filter.numCapsSerial} последовательно<br>` +
      `${bestDevice.filter.numCapsParallel} параллельно<br> ` +
      `Всего ${bestDevice.filter.numCaps} шт.` +
      `</td>` +
      `</tr>` +
      `</table>` +
      `</div>`;
    $('#bestDeviceBlock').replaceWith(bestDeviceBlock);
  } else {
    $('#bestDeviceBlock').append(
      `<div id='bestDeviceBlock'>` +
      `<table align='center' cellpadding='5px' class='tableDevices' style='border-spacing:6px; margin-top:220px'>` +
      `<tr>` +
      `<td colspan="4" align='center' class='title2' style='font-size:30px'>К сожалению, нет подходящих схемных решений</td>` +
      `</tr>` +
      `</table>` +
      `</div>`
    );
  }
}

// Создать блок аналогичного устройства
function createSimilarDeviceBlock(lists) {
  if (!lists.filter) {
    lists.filter = `
      <select class='filter' onchange='changeSimilarDeviceBlock(this.className, this.value)'>
        <option style='font-size:14px;' value='-1'>Пожалуйста, сначала выберите выпрямитель</option>
      </select>`;
  }

  const similarDeviceBlock =
    `<div id='similarDeviceBlock'>` +
    `<table align='center' cellpadding='5px' class='tableDevices' id='similarDeviceDescription' style='border-spacing:6px; margin-top:20px;'>` +
    `<tr class='title4'>` +
    `<td style='font-size:25px; font-style: italic;' align='center' width='1250px' colspan='6'>&nbsp;Аналогичное устройство</td>` +
    `</tr>` +
    `</table>` +

    `<table align='center' cellpadding='5px' class='tableDevices' style='border-spacing:6px;'>` +
    `<tr style='vertical-align:top;' class='title2' align='left'>` +
    `<td colspan='4'>` +
    `<a style='font-weight:bold; font-size:20px'>Трансформатор: ${lists.transformer}</a><br>` +
    `</td>` +
    `</tr>` +
    `<tr id='transformerBlock'>` +
    `</tr>` +
    `</table>` +

    `<table align='center' cellpadding='5px' class='tableDevices' style='border-spacing:6px;'>` +
    `<tr style='vertical-align:top;' class='title2' align='left'>` +
    `<td colspan='3'>` +
    `<a style='font-weight:bold; font-size:20px'>Выпрямитель: ${lists.rectifier}</a><br>` +
    `</td>` +
    `</tr>` +
    `<tr id='rectifierBlock'>` +
    `</tr>` +
    `</table>` +


    `<table align='center' cellpadding='5px' class='tableDevices' id='filterListBlock' style='border-spacing:6px;'>` +
    `<tr style='vertical-align:top;' class='title2' align='left'>` +
    `<td colspan='3'>` +
    `<a style='font-weight:bold; font-size:20px'>Фильтр: ${lists.filter}</a><br>` +
    `</td>` +
    `</tr>` +
    `<tr id='filterBlock'>` +
    `</tr>` +
    `</table>` +
    `</div>`;
  $('#similarDeviceBlock').replaceWith(similarDeviceBlock);
}

// Блок аналогичного устройства
function getSimilarDeivce(list, value) {
  simpleDevices[list] = +value;

  return new Promise(resolve => {
    $.ajax({
      url: '/similarDeivce',
      method: 'POST',
      data: {
        parameters,
        simpleDevices,
        bestDevice
      },
      success: function(response) {
        if (response) {
          resolve(response[0]);
        } else {
          $('#similarDeviceBlock').append(`<td colspan="4" align='center' class='title2'>К сожалению, нет подходящих схемных решений</td>`);
        }
      }
    })
  });

}

// Изменение блока аналогичного устройства
async function changeSimilarDeviceBlock(list, value) {
  similarDevice = await getSimilarDeivce(list, value);

  if (list === 'transformer') {
    $('#transformerBlock').replaceWith(
      `<tr style='vertical-align:top;' id='transformerBlock' class='title2'>` +
      `<td width='28%' align='left'>` +
      `Цена: ${similarDevice.transformer.price} руб.<br>` +
      `Эксплуатационные затраты: ${similarDevice.transformer.lossesCost} руб.<br>` +
      `Суммарные затраты: ${similarDevice.transformer.totalCosts} руб.<br>` +
      `Тепловые потери: ${similarDevice.transformer.Plosses} Вт<br>` +
      `Рабочая температура: ${similarDevice.transformer.T} &deg;C<br>` +
      `Макс. допустимая температура: ${similarDevice.transformer.Tmax} &deg;C<br>` +
      `Рабочая магнитная индукция: ${similarDevice.transformer.Bm} Тл<br>` +
      `Коэффициент трансформации: ${similarDevice.transformer.K12}<br>` +
      `Коэффициент окна: ${similarDevice.transformer.Kwindow}<br>` +
      `Масса: ${+(similarDevice.transformer.mass * 1000).toFixed(1)} г<br>` +
      `</td>` +

      `<td width='24%' align='left'>` +
      `<a style='font-weight:bold;'>Магнитопровод:</a><br>` +
      `Производитель: ${similarDevice.transformer.core.producer}<br>` +
      `Форма: ${similarDevice.transformer.core.form}<br>` +
      `Размеры: ${similarDevice.transformer.core.OD * 1000}x${similarDevice.transformer.core.ID * 1000}x${similarDevice.transformer.core.h * 1000} мм<br>` +
      `Материал: ${similarDevice.transformer.core.material}<br>` +
      `Цена: ${similarDevice.transformer.core.price} руб.<br>` +
      `<a href='${similarDevice.transformer.core.href}' target='_blank'>Ссылка на товар<br></a>` +
      `</td>` +

      `<td width='24%' align='left'>` +
      `<a style='font-weight:bold;'>Первичная обмотка:</a><br>` +
      `Напряжение с уч. стаб.: ${similarDevice.transformer.winding1.UrmsReal} В<br>` +
      `Число витков: ${similarDevice.transformer.winding1.w}<br>` +
      `Число паралл. проводников: ${similarDevice.transformer.winding1.parallelWires}<br>` +
      `Общая длина: ${+(similarDevice.transformer.winding1.l * similarDevice.transformer.winding1.parallelWires).toFixed(3)} м<br>` +
      `Цена: ${similarDevice.transformer.winding1.price} руб.<br><br>` +
      `Провод: ${similarDevice.transformer.winding1.wire.name} ${+(similarDevice.transformer.winding1.wire.d * 1000).toFixed(2)}мм<br>` +
      `<a href='${similarDevice.transformer.winding1.wire.href}' target='_blank'>Ссылка на товар<br></a>` +

      `</td>` +

      `<td width='24%' align='left'>` +
      `<a style='font-weight:bold;'>Вторичная обмотка:</a><br>` +
      `Напряжение без стаб.: ${similarDevice.transformer.winding2.UrmsReal} В<br>` +
      `Число витков: ${similarDevice.transformer.winding2.w}<br>` +
      `Число паралл. проводников: ${similarDevice.transformer.winding2.parallelWires}<br>` +
      `Общая длина: ${+(similarDevice.transformer.winding2.l * similarDevice.transformer.winding2.parallelWires).toFixed(3)} м<br>` +
      `Цена: ${similarDevice.transformer.winding2.price} руб.<br><br>` +
      `Провод: ${similarDevice.transformer.winding2.wire.name} ${+(similarDevice.transformer.winding2.wire.d * 1000).toFixed(2)}мм<br>` +
      `<a href='${similarDevice.transformer.winding2.wire.href}' target='_blank'>Ссылка на товар<br></a>` +
      `</td>` +
      `</tr>`
    );

  } else if (list === 'rectifier') {
    if (oldRectifierName !== similarDevice.rectifier.rectifierType) {
      $('#similarDeviceDescription').replaceWith(
        `<table align='center' cellpadding='5px' class='tableDevices' id='similarDeviceDescription' style='border-spacing:6px; margin-top:20px;'>` +
        `<tr class='title4'>` +
        `<td style='font-size:25px; font-style: italic;' align='center' width='1250px' colspan='6'>&nbsp;Аналогичное устройство</td>` +
        `</tr>` +
        `</table>`
      );

      if (similarDevice.rectifier.rectifierType === 'Полный мост (Гретца)') {
        lists.filter = lists.filterFull;
      } else if (similarDevice.rectifier.rectifierType === 'Однополупериодный (четвертьмост)') {
        lists.filter = lists.filterHalf;
      }

      $('#filterListBlock').replaceWith(
        `<table align='center' cellpadding='5px' class='tableDevices' id='filterListBlock' style='border-spacing:6px;'>` +
        `<tr style='vertical-align:top;' class='title2' align='left'>` +
        `<td colspan='3'>` +
        `<a style='font-weight:bold; font-size:20px'>Фильтр: ${lists.filter}</a><br>` +
        `</td>` +
        `</tr>` +
        `<tr id='filterBlock'>` +
        `</tr>` +
        `</table>`
      );
    }

    oldRectifierName = JSON.parse(JSON.stringify(similarDevice.rectifier.rectifierType));

    $('#rectifierBlock').replaceWith(
      `<tr style='vertical-align:top;' id='rectifierBlock' class='title2'>` +
      `<td width='33%' align='left'>` +
      `Схема: ${similarDevice.rectifier.rectifierType}<br>` +
      `Цена: ${similarDevice.rectifier.price} руб.<br>` +
      `Эксплуатационные затраты: ${similarDevice.rectifier.lossesCost} руб.<br>` +
      `Суммарные затраты: ${similarDevice.rectifier.totalCosts} руб.<br>` +
      `Тепловые потери: ${similarDevice.rectifier.Plosses} Вт<br>` +
      `Макс. прямой ток: ${similarDevice.rectifier.forwardCurrent} А<br>` +
      `Макс. обратное напряжение: ${similarDevice.rectifier.prrVoltage} В<br>` +
      `</td>` +

      `<td width='33%' align='left'>` +
      `<a style='font-weight:bold;'>Параметры диода:</a><br>` +
      `Наименование: ${similarDevice.rectifier.diode.name}<br>` +
      `Параметры: ${similarDevice.rectifier.diode.voltageDrop}В ${similarDevice.rectifier.diode.forwardCurrent}А ${similarDevice.rectifier.diode.prrVoltage}В<br>` +
      `Рассеиваемая мощность: ${similarDevice.rectifier.PlossesOfOne} Вт<br>` +
      `Запас по напряжению: ${similarDevice.rectifier.prrVoltageReserve} %<br>` +
      `Запас по току: ${similarDevice.rectifier.forwardCurrentReserve} %<br>` +
      `Цена: ${similarDevice.rectifier.diode.price} руб.<br>` +
      `<a href='${similarDevice.rectifier.diode.href}' target='_blank'>Ссылка на товар<br></a>` +
      `</td>` +

      `<td width='33%' align='left'>` +
      `<a style='font-weight:bold;'>Количество диодов:</a><br>` +
      `${similarDevice.rectifier.numDiodesVoltageDrop / similarDevice.rectifier.numDiodesVoltageDropInit} последовательно<br>` +
      `${similarDevice.rectifier.numDiodesParallel} параллельно<br> ` +
      `Всего ${similarDevice.rectifier.diodesNum} шт.` +
      `</td>` +
      `</tr>`
    );

  } else if (list === 'filter') {
    $('#filterBlock').replaceWith(
      `<tr style='vertical-align:top;' id='filterBlock' class='title2'>` +
      `<td width='33%' align='left'>` +
      `<a style='font-weight:bold;'>Электролитический конденсатор:</a><br>` +
      `Цена: ${similarDevice.filter.price} руб.<br>` +
      `Суммарная емкость: ${similarDevice.filter.capacity} мкФ<br>` +
      `Макс. рабочее напряжение: ${similarDevice.filter.voltage} В<br>` +
      `</td>` +

      `<td width='33%' align='left'>` +
      `<a style='font-weight:bold;'>Параметры конденсатора:</a><br>` +
      `Производитель: ${similarDevice.filter.capacitor.producer}<br>` +
      `Емкость: ${similarDevice.filter.capacitor.capacity} мкФ<br>` +
      `Макс. рабочее напряжение: ${similarDevice.filter.capacitor.voltage} В<br>` +
      `Запас по напряжению: ${similarDevice.filter.voltageReserve} %<br>` +
      `Цена: ${similarDevice.filter.capacitor.price} руб.<br>` +
      `<a href='${similarDevice.filter.capacitor.href}' target='_blank'>Ссылка на товар<br></a>` +
      `</td>` +

      `<td width='33%' align='left'>` +
      `<a style='font-weight:bold;'>Количество конденсаторов:</a><br>` +
      `${similarDevice.filter.numCapsSerial} последовательно<br>` +
      `${similarDevice.filter.numCapsParallel} параллельно<br> ` +
      `Всего ${similarDevice.filter.numCaps} шт.` +
      `</td>` +
      `</tr>`
    );
  }

  if (similarDevice.transformer && similarDevice.rectifier && similarDevice.filter) {
    $('#similarDeviceDescription').replaceWith(
      `<table align='center' cellpadding='5px' class='tableDevices' id='similarDeviceDescription' style='border-spacing:6px; margin-top:20px;'>` +
      `<tr class='title4'>` +
      `<td style='font-size:25px; font-style: italic;' align='center' width='1250px' colspan='6'>&nbsp;Аналогичное устройство</td>` +
      `</tr>` +

      `<tr class='title2'>` +
      `<td colspan='5'>` +
      `${similarDevice.description}` +
      `</td>` +
      `</tr>` +

      `<tr class='title2'>` +
      `<td colspan='2'>` +
      `${similarDevice.advantages}` +
      `</td>` +

      `<td colspan='3'>` +
      `${similarDevice.disadvantages}` +
      `</td>` +
      `</tr>` +

      `<tr class='title2'>` +
      `<td align='left' rowspan='2' width='36%' height='100px'>` +
      `<a style='font-weight:bold; font-size:20px;'>Параметры устройства:</a><br>` +
      `Размах пульсаций напряжения на нагрузке: ${similarDevice.filter.pulsatingVoltageReal} %<br>` +
      `Потребляемая мощность: ${similarDevice.Pin} Вт<br>` +
      `Питающий ток: ${+(similarDevice.Pin / parameters.U1rms).toFixed(2)} А<br>` +
      `Питающее напряжение: ${parameters.U1rms} В<br>` +
      `Полезная мощность: ${similarDevice.Pout} Вт<br>` +
      `Ток нагрузки: ${parameters.I2} А<br>` +
      `Напряжение на нагрузке: ${parameters.U2} В<br>` +
      `Тепловые потери: ${similarDevice.Plosses} Вт<br>` +
      `КПД: ${similarDevice.efficiency} %<br>` +
      `</td>` +

      `<td align='center' rowspan='2' width='16%'>` +
      `<a style='line-height:30px; font-weight:bold;'>Схема устройства:</a><br>` +
      `<img src='images/schemes/${similarDevice.rectifier.rectifierType}.jpg' class='finalSchemeImage'>` +
      `</td>` +

      `<td align='center' width='16%'><a style='font-weight:bold;'>Цена</a></td>` +
      `<td align='center' width='16%'><a style='font-weight:bold;'>Затраты на<br>потери э/э<br>в течение ${parameters.workingYears} лет</a></td>` +
      `<td align='center' width='16%'><a style='font-weight:bold;'>Суммарные затраты<br>за ${parameters.workingYears} года/лет</a></td>` +
      `</tr>` +

      `<tr class='title2'>` +
      `<td style='font-weight:bold; font-size:24px' align='center'>` +
      `${+similarDevice.price.toFixed(0)} руб. <br>` +
      `</td>` +
      `<td style='font-weight:bold; font-size:24px' align='center'>` +
      `${+similarDevice.lossesCost.toFixed(0)} руб.<br>` +
      `</td>` +
      `<td style='font-weight:bold; font-size:24px' align='center'>` +
      `${+similarDevice.totalCosts.toFixed(0)} руб.<br>` +
      `</td>` +
      `</tr>` +
      `</table>`
    );
  }
}