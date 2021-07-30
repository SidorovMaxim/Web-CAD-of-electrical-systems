const express = require("express");
const fs = require("fs");
const app = express();
const bodyParser = require("body-parser");
const request = require('request');

parseCapacitors();



// Capacitors
function parseCapacitors() {
	let arrCapacitors = [];
	let numOfFiles = fs.readdirSync('./parser/current/capacitors', 'utf8');
	for (let i = 0; i < numOfFiles.length - 1; i++) {
		let readFile = fs.readFileSync('./parser/current/capacitors/capacitorsPage' + i + '.json', 'utf8');

		// Стоимость конденсаторов
		let price = readFile
			.match(/id="price_\d*">.*/gm)
			.map(item => item && item.split('>'))
			.map(item => item && item[1].replace('</span', '').replace(/&#160;/, ''));

		// Производитель конденсаторов
		let producer = readFile
			.match(/<div class="nw">Пр-во:.*/gm)
			.map(item => item && item.split('>'))
			.map(item => item && item[2].replace('</span', ''));

		readFile = readFile
			.match(/href="\/product.*?<\/a>/gm)
			.map(item => item && item.replace('href="', 'https://www.chipdip.ru'))
			.map(item => item && item.split('"'));

		// Емкость конденсаторов
		let capacity = readFile
			.map(item => item && item[1].match(/\d*\W\d*(мкф|uf)/i))
			.map(item => item && item[0].replace(/>|\s|мкф|uf/gi, '').replace(',', '.'));

		// Напряжение конденсаторов
		let voltage = readFile
			.map(item => item && item[1].match(/\d*\W\d*(в|v)/i))
			.map(item => item && item[0].replace(/х|\s|v|в/gi, '').replace(',', '.'));

		// Ссылка на страницы конденсаторов
		let href = readFile
			.map(item => item && item[0]);

		capacity.forEach(
			function(i, j) {
				arrCapacitors.push({
					'price': Number(price[j]),
					'capacity': Number(capacity[j]),
					'voltage': Number(voltage[j]),
					'producer': producer[j],
					'href': href[j]
				});
			}
		);
	}

	arrCapacitors = JSON.stringify(arrCapacitors, null, '\t');
	console.log(arrCapacitors.length);
	//console.log(arrCapacitors);
	fs.writeFileSync('./dataBase/Capacitors.json', arrCapacitors);
	parseDiodes();
}



// Diodes
function parseDiodes() {
	let arrDiodes = [];
	let numOfFiles = fs.readdirSync('./parser/current/diodes', 'utf8');
	for (let i = 0; i < numOfFiles.length - 1; i++) {
		let readFile = fs.readFileSync('./parser/current/diodes/diodesPage' + i + '.json', 'utf8');

		// Стоимость диода
		let price = String(readFile
				.match(/id="price_\d*">.*?</))
			.replace(/</, '')
			.replace(/&#160;/, '')
			.replace(/id="price_\d*">/, '');

		// Максимальный непрерывный прямой ток диода
		let forwardCurrent = String(readFile
				.match(/Прямой ток диода \(средний\) \d*.\d* (мА|mA|А|A)/))
			.replace('Прямой ток диода (средний) ', '')
			.replace(/,(мА|mA|А|A)/, '');
		if (forwardCurrent == 'null') {
			forwardCurrent = String(readFile
					.match(/Максимальный непрерывный прямой ток<\/div>\r\n<div class="product__param-value">\d*.\d*(мА|mA|А|A)?/g))
				.replace(/.*>/gs, '');
		}
		if (forwardCurrent == 'null') {
			forwardCurrent = String(readFile
					.match(/<div class="product__param-name">Максимальный прямой.*?\(выпрямленный за полупериод\) ток.*?class="product__param-value">.*?<\/div>/gsi))
				.replace(/<div class.*">/s, '')
				.replace(/(<\/a><\/div>|<\/div>)/, 'A');
		}
		if (forwardCurrent.search(/mA|мА/i) != -1) {
			forwardCurrent = forwardCurrent.replace(/mA|мА/i, '');
			forwardCurrent = forwardCurrent / 1000;
		} else if (forwardCurrent.search(/А|A/i) != -1) {
			forwardCurrent = forwardCurrent.replace(/( |)(А|A)/i, '');
		} else {
			forwardCurrent = 'null';
		}

		// Максимальное постоянное обратное напряжение диода
		let prrVoltage = String(readFile
				.match(/Максимальное обратное напряжение диода \d*.\d* (В|V|кВ|kV)/))
			.replace('Максимальное обратное напряжение диода ', '')
			.replace(/,(В|V|кВ|kV)/, '');
		if (prrVoltage == 'null') {
			prrVoltage = String(readFile
					.match(/Пиковое обратное повторяющееся напряжение<\/div>\r\n<div class="product__param-value">\d*.\d*(В|V|кВ|kV)?/g))
				.replace(/.*>/gs, '');
		}
		if (prrVoltage == 'null') {
			prrVoltage = String(readFile
					.match(/<div class="product__param-name">Максимальное постоянное обратное напряжение.*?class="product__param-value">.*?<\/div>/s))
				.replace(/<div class.*">/s, '')
				.replace(/(<\/a><\/div>|<\/div>)/, 'V');
		}
		if (prrVoltage.search(/кВ|kV/i) != -1) {
			prrVoltage = prrVoltage.replace(/( |)(кВ|kV)/i, '');
			prrVoltage = prrVoltage * 1000;
		} else if (prrVoltage.search(/В|V/i) != -1) {
			prrVoltage = prrVoltage.replace(/В|V/i, '');
		} else {
			prrVoltage = 'null';
		}

		// Прямое падение напряжения на диоде
		let voltageDrop = String(readFile
				.match(/Прямое падение напряжения \d*.\d* (В|V|мВ|mV)/))
			.replace('Прямое падение напряжения ', '')
			.replace(/,(В|V|мВ|mV)/, '');
		if (voltageDrop == 'null') {
			voltageDrop = String(readFile
					.match(/Maximum Forward Voltage Drop<\/div>\r\n<div class="product__param-value">\d*.\d*(В|V|мВ|mV)?/g))
				.replace(/.*>/gs, '');
		}
		if (voltageDrop == 'null') {
			voltageDrop = String(readFile
					.match(/<div class="product__param-name">Максимальное прямое напряжение.*?class="product__param-value">.*?<\/div>/s))
				.replace(/<div class.*">/s, '')
				.replace(/(<\/a><\/div>|<\/div>)/, 'V');
		}
		if (voltageDrop.search(/мВ|mV/i) != -1) {
			voltageDrop = voltageDrop.replace(/( |)(мВ|mV)/i, '');
			voltageDrop = voltageDrop / 1000;
		} else if (voltageDrop.search(/В|V/i) != -1) {
			voltageDrop = voltageDrop.replace(/В|V/i, '');
		} else {
			voltageDrop = 'null';
		}

		// Наименование диода
		let name = readFile
			.substring(readFile.indexOf('<title>'), readFile.indexOf('|'))
			.replace(/<title>|,.*| /g, '');

		// Ссылка на страницу диода
		let href = String(readFile
				.match(/<link rel="canonical" href="https:\/\/www\.chipdip\.ru\/product.*?\/.*">/))
			.replace('<link rel="canonical" href="', '')
			.replace('">', '');

		if (href != 'null') {
			arrDiodes.push({
				'price': Number(price),
				'voltageDrop': Number(voltageDrop),
				'prrVoltage': Number(prrVoltage),
				'forwardCurrent': Number(forwardCurrent),
				'name': name,
				'href': href
			});
		}
	}

	arrDiodes = JSON.stringify(arrDiodes, null, '\t');
	console.log(arrDiodes.length);
	//console.log(arrDiodes);
	fs.writeFileSync('./dataBase/Diodes.json', arrDiodes);
	parseCores();
}



// Cores
function parseCores() {
	let arrCores = [];
	let numOfFiles = fs.readdirSync('./parser/current/cores', 'utf8');
	for (let i = 0; i < numOfFiles.length - 1; i++) {
		let readFile = fs.readFileSync('./parser/current/cores/coresPage' + i + '.json', 'utf8');

		// Стоимость сердченика
		let price = String(readFile
				.match(/id="price_\d*">.*?</))
			.replace(/</, '')
			.replace(/&#160;/, '')
			.replace(/id="price_\d*">/, '');

		// Размеры сердечника
		let sizes = String(readFile
				.substring(readFile.indexOf('<title>'), readFile.indexOf(' |'))
				.match(/\d*(\.|)\d*х( |)\d*(\.|)\d*х\d*(\.|)\d*/g))
			.replace(' ', '')
			.split('х');
		let OD = +sizes[0] / 1000;
		let ID = +sizes[1] / 1000;
		let h = +sizes[2] / 1000;

		// Масса сердечника
		let mass = String(readFile
				.match(/<div class="product__param-name">Вес.*?class="product__param-value">.*?<\/div>/s))
			.replace(/<div class.*">/s, '')
			.replace(/(<\/a><\/div>|<\/div>)/, '');

		// Форма сердечника
		let form = String(readFile
				.match(/<div class="product__param-name">Форма магнитопровода.*?class="product__param-value">.*?<\/div>/s))
			.replace(/<div class.*">/s, '')
			.replace(/(<\/a><\/div>|<\/div>)/, '');

		// Материал сердечника
		let material = String(readFile
				.match(/<div class="product__param-name">Материал магнитопровода.*?class="product__param-value">.*?<\/div>/s))
			.replace(/<div class.*">/s, '')
			.replace(/(<\/a><\/div>|<\/div>)/, '')
			.replace(/h|н/g, 'Н')
			.replace(/m|м/g, 'М')
			.replace(/c|с/g, 'С')
			.replace(/п/g, 'П')
			.replace(/в/g, 'В');
		if (material == 'М2500НМС') {
			material = 'М2500НМС1';
		}

		// Наименование сердечника
		let name = readFile
			.substring(readFile.indexOf('<title>'), readFile.indexOf(' |'))
			.replace('<title>', '');

		// Производитель сердечника
		let producer = String(readFile
				.match(/<div class="product__control"><span class="product__control-name">Производитель:.*/g))
			.replace(/^.*"brand">/, '')
			.replace('</a></div>', '');

		// Ссылка на страницу сердечника
		let href = String(readFile
				.match(/<link rel="canonical" href="https:\/\/www\.chipdip\.ru\/product.*?\/.*">/))
			.replace('<link rel="canonical" href="', '')
			.replace('">', '');

		if (href != 'null') {
			//fs.writeFileSync('./dataBase/test/diodesPage' + i + '.html', readFile);
			arrCores.push({
				'price': Number(price),
				'OD': OD,
				'ID': ID,
				'h': h,
				'mass': Number(mass) / 1000,
				'form': form,
				'material': material,
				'name': name,
				'producer': producer,
				'href': href
			});
		}
	}

	arrCores = JSON.stringify(arrCores, null, '\t');
	console.log(arrCores.length);
	//console.log(arrDiodes);
	fs.writeFileSync('./dataBase/Cores.json', arrCores);
	parseWires();
}



// Wires
function parseWires() {
	let arrWires = [];
	let numOfFiles = fs.readdirSync('./parser/current/wires', 'utf8');
	for (let i = 0; i < numOfFiles.length - 1; i++) {
		let readFile = fs.readFileSync('./parser/current/wires/wiresPage' + i + '.json', 'utf8');

		// Стоимость провода
		let price = readFile
			.match(/id="price_\d*">.*/gm)
			.map(item => item && item.split('>'))
			.map(item => item && item[1].replace('</span', '').replace(/&#160;/, ''));

		readFile = readFile
			.match(/href="\/product.*?<\/a>/gm)
			.map(item => item && item.replace('href="', 'https://www.chipdip.ru'))
			.map(item => item && item.split('"'));

		// Название провода
		let name = readFile
			.map(item => item && item[1].match(/ПЭТВ-2 \(d=.*? мм\)/i));

		// Диаметр провода
		let d = readFile
			.map(item => item && item[1].match(/d=.*? мм/i))
			.map(item => item && item[0].match(/\d*\d(\.|)\d*/))
			.map(item => item && item[0]);

		// Длина провода
		let l = readFile
			.map(item => item && item[1].match(/\d*\d(,|\.|)\d*( |)м( |,)/))
			.map(item => item && item[0].replace(/м,|м/, '').replace(',', '.'));

		// Ссылка на страницу провода
		let href = readFile
			.map(item => item && item[0]);

		price.forEach(
			function(i, j) {
				if (name[j] != null) {
					arrWires.push({
						'price': +((+price[j] / +l[j]).toFixed(2)),
						'name': String(name[j]),
						'd': +(Number(d[j]) / 1000).toFixed(5),
						'href': href[j]
					});
				}
			}
		);
	}

	arrWires = JSON.stringify(arrWires, null, '\t');
	console.log(arrWires.length);
	//console.log(arrWires);
	fs.writeFileSync('./dataBase/WiresPrices.json', arrWires);
}


//.filter(item => item !== 'EEUF')
// arrDescription = readFile
//  .map(item => item && item[1]);