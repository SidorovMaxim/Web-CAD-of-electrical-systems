const express = require("express");
const fs = require("fs");
const app = express();
const bodyParser = require("body-parser");
const request = require('request');

let timeout = 300;
let elementsDir = ['capacitors', 'diodes', 'cores', 'wires'];
let arrHref = [];
let arrHrefDiodesPages = [];
let typeOfDiodes = ['rectifier', 'power-rus', 'high-speed', 'schottky'];
let typeNumOfDiodes = 0;
let arrHrefCoresPages = [];
let typeOfCores = ['HXs', 'UNz'];
let typeNumOfCores = 0;
let absPrice = 1000000;

let minPrice = 0.01;
let maxPrice = 1;
let numOfPageTemp = 1;
let multiplier = 0;
let numOfPage = 0;

deleteOldData();
// selectCapacitors();
// selectDiodes();
// selectCores();
// gettingWires();


// Удаление старых данных
function deleteOldData() {
	elementsDir.forEach(function(item, j) {
		let numOfFiles = fs.readdirSync(`./parser/current/${item}`, 'utf8');
		if (numOfFiles != 0) {
			for (let i = 0; i < numOfFiles.length; i++) {
				fs.unlinkSync(`./parser/current/${item}/${item}Page` + i + '.json', 'utf8');
			}
		}
	});
	selectCapacitors();
}



// Capacitors
// Инкрементация ценового диапазона конденсаторов до 50 страниц
function selectCapacitors() {
	setTimeout(function() {
		request({
				method: 'GET',
				url: url = 'https://www.chipdip.ru/catalog/aluminum-electrolytic-capacitors?minprice=' + minPrice + '&maxprice=' + maxPrice + '&sort=priceup&page=50',
			},
			function(error, response, body) {
				if (maxPrice < absPrice) {
					if (response.statusCode == 404) {
						multiplier++;
						maxPrice = maxPrice * 2 ^ multiplier;
						console.log('Not enough numbers of pages' + '   Current min price: ' + minPrice + '   Current max price: ' + maxPrice);
						selectCapacitors();
					} else {
						multiplier = 0;
						console.log('Number of Pages 50 or more');
						gettingCapacitors();
					}
				} else {
					gettingCapacitors();
				}
			}
		);
	}, timeout);
};

// Запрос и сохранение 50+ страниц после подбора или менее 50 страниц при достижении ограничителя диапазона цен для конденсаторов
function gettingCapacitors() {
	setTimeout(function() {
		request({
				method: 'GET',
				url: url = 'https://www.chipdip.ru/catalog/aluminum-electrolytic-capacitors?minprice=' + minPrice + '&maxprice=' + maxPrice + '&sort=priceup&page=' + numOfPageTemp,
			},
			function(error, response, body) {
				if (!error && response.statusCode == 200) {
					let file = './parser/current/capacitors/capacitorsPage' + numOfPage + '.json';
					fs.writeFileSync(file, body);
					console.log(`Saving file capacitorsPage${numOfPage}`);
					numOfPageTemp++;
					numOfPage++;
					gettingCapacitors();
				} else {
					console.log(numOfPage, 'Error', response.statusCode);
					minPrice = maxPrice + 0.01;
					maxPrice = maxPrice + 1;
					numOfPageTemp = 1;
					if (maxPrice > absPrice) {
						minPrice = 0.01;
						maxPrice = 1;
						numOfPageTemp = 1;
						multiplier = 0;
						numOfPage = 0;
						selectDiodes();
					} else {
						selectCapacitors();
					}
				}
			}
		);
	}, timeout);
};



// Diodes
// Инкрементация ценового диапазона диодов до 50 страниц
function selectDiodes() {
	setTimeout(function() {
		request({
				method: 'GET',
				url: url = 'https://www.chipdip.ru/catalog/diodes-' + typeOfDiodes[typeNumOfDiodes] + '?minprice=' + minPrice + '&maxprice=' + maxPrice + '&sort=priceup&page=50',
			},
			function(error, response, body) {
				if (maxPrice < absPrice) {
					if (response.statusCode == 404) {
						multiplier++;
						maxPrice = maxPrice * 2 ^ multiplier;
						console.log('Not enough numbers of pages' + '   Current min price: ' + minPrice + '   Current max price: ' + maxPrice);
						selectDiodes();
					} else {
						multiplier = 0;
						console.log('Number of Pages 50 or more');
						gettingHrefsToDiodePages();
					}
				} else {
					gettingHrefsToDiodePages();
				}
			}
		);
	}, timeout);
};

// Запрос и сохранение 50+ страниц после подбора или менее 50 страниц при достижении ограничителя диапазона цен для диодов
function gettingHrefsToDiodePages() {
	setTimeout(function() {
		request({
				method: 'GET',
				url: url = 'https://www.chipdip.ru/catalog/diodes-' + typeOfDiodes[typeNumOfDiodes] + '?minprice=' + minPrice + '&maxprice=' + maxPrice + '&sort=priceup&page=' + numOfPageTemp,
			},
			function(error, response, body) {
				if (!error && response.statusCode == 200) {
					arrHrefDiodesPages.push(body);
					console.log(`${typeOfDiodes[typeNumOfDiodes]}   Saving file with hrefsToDiodePage${numOfPage}`);
					numOfPageTemp++;
					numOfPage++;
					gettingHrefsToDiodePages();
				} else {
					console.log(numOfPage, 'Error', response.statusCode);
					minPrice = maxPrice + 0.01;
					maxPrice = maxPrice + 1;
					numOfPageTemp = 1;
					if (maxPrice > absPrice) {
						minPrice = 0.01;
						maxPrice = 1;
						numOfPageTemp = 1;
						multiplier = 0;
						if (typeNumOfDiodes < (typeOfDiodes.length - 1)) {
							typeNumOfDiodes++;
							selectDiodes();
						} else {
							numOfPage = 0;
							parseHrefPagesDiodes();
						}
					} else {
						selectDiodes();
					}
				}
			}
		);
	}, timeout);
};

function parseHrefPagesDiodes() {
	arrHrefDiodesPages.forEach(
		function(item, j) {
			arrHrefDiodesPages[j] = item
				.match(/href="\/product.*?<\/a>/gm)
				.map(item => item && item.replace('href="', 'https://www.chipdip.ru'))
				.map(item => item && item.split('"'))
				.map(item => item && item[0]);
			arrHrefDiodesPages[j].forEach(
				function(item, j) {
					arrHref.push(item);
				});
		});
	console.log(arrHref.length, arrHref);
	gettingDiodes();
}

function gettingDiodes() {
	arrHref.forEach(
		function(item, j) {
			setTimeout(function() {
				request({
						method: 'GET',
						url: url = item,
					},
					function(error, response, body) {
						if (!error && response.statusCode == 200) {
							let file = './parser/current/diodes/diodesPage' + j + '.json';
							fs.writeFileSync(file, body);
							console.log(`Saving file diodesPage${j}`);
						} else {
							console.log(j, 'Error', response.statusCode);
						}
					}
				);
			}, timeout);
			timeout += 300;
		}
	);
	setTimeout(function() {
		timeout = 300;
		arrHref = [];
		selectCores();
	}, timeout);
}



// Cores
// Инкрементация ценового диапазона диодов до 50 страниц
function selectCores() {
	setTimeout(function() {
		request({
				method: 'GET',
				url: url = 'https://www.chipdip.ru/catalog/ferrites?x.500=' + typeOfCores[typeNumOfCores] + '&minprice=' + minPrice + '&maxprice=' + maxPrice + '&sort=priceup&page=50',
			},
			function(error, response, body) {
				if (maxPrice < absPrice) {
					if (response.statusCode == 404) {
						multiplier++;
						maxPrice = maxPrice * 2 ^ multiplier;
						console.log('Not enough numbers of pages' + '   Current min price: ' + minPrice + '   Current max price: ' + maxPrice);
						selectCores();
					} else {
						multiplier = 0;
						console.log('Number of Pages 50 or more');
						gettingHrefsToCorePages();
					}
				} else {
					gettingHrefsToCorePages();
				}
			}
		);
	}, timeout);
};

// Запрос и сохранение 50+ страниц после подбора или менее 50 страниц при достижении ограничителя диапазона цен для диодов
function gettingHrefsToCorePages() {
	setTimeout(function() {
		request({
				method: 'GET',
				url: url = 'https://www.chipdip.ru/catalog/ferrites?x.500=' + typeOfCores[typeNumOfCores] + '&minprice=' + minPrice + '&maxprice=' + maxPrice + '&sort=priceup&page=' + numOfPageTemp,
			},
			function(error, response, body) {
				if (!error && response.statusCode == 200) {
					arrHrefCoresPages.push(body);
					console.log(`${typeOfCores[typeNumOfCores]}   Saving file with hrefsToCorePage${numOfPage}`);
					numOfPageTemp++;
					numOfPage++;
					gettingHrefsToCorePages();
				} else {
					console.log(numOfPage, 'Error', response.statusCode);
					minPrice = maxPrice + 0.01;
					maxPrice = maxPrice + 1;
					numOfPageTemp = 1;
					if (maxPrice > absPrice) {
						minPrice = 0.01;
						maxPrice = 1;
						numOfPageTemp = 1;
						multiplier = 0;
						if (typeNumOfCores < (typeOfCores.length - 1)) {
							typeNumOfCores++;
							selectCores();
						} else {
							numOfPage = 0;
							parseHrefPagesCores();
						}
					} else {
						selectCores();
					}
				}
			}
		);
	}, timeout);
};

function parseHrefPagesCores() {
	arrHrefCoresPages.forEach(
		function(item, j) {
			arrHrefCoresPages[j] = item
				.match(/href="\/product.*?<\/a>/gm)
				.map(item => item && item.replace('href="', 'https://www.chipdip.ru'))
				.map(item => item && item.split('"'))
				.map(item => item && item[0]);
			arrHrefCoresPages[j].forEach(
				function(item, j) {
					arrHref.push(item);
				});
		});
	console.log(arrHref.length, arrHref);
	gettingCores();
}

function gettingCores() {
	arrHref.forEach(
		function(item, j) {
			setTimeout(function() {
				request({
						method: 'GET',
						url: url = item,
					},
					function(error, response, body) {
						if (!error && response.statusCode == 200) {
							let file = './parser/current/cores/coresPage' + j + '.json';
							fs.writeFileSync(file, body);
							console.log(`Saving file coresPage${j}`);
						} else {
							console.log(j, 'Error', response.statusCode);
						}
					}
				);
			}, timeout);
			timeout += 300;
		}
	);
	setTimeout(function() {
		timeout = 300;
		arrHref = [];
		gettingWires();
	}, timeout);
}



// Wires
// Запрос и сохранение страниц для проводов
function gettingWires() {
	setTimeout(function() {
		request({
				method: 'GET',
				url: url = 'https://www.chipdip.ru/catalog/winding-wire?page=' + numOfPageTemp,
			},
			function(error, response, body) {
				if (!error && response.statusCode == 200) {
					let file = './parser/current/wires/wiresPage' + numOfPage + '.json';
					fs.writeFileSync(file, body);
					console.log(`Saving file wiresPage${numOfPage}`);
					numOfPageTemp++;
					numOfPage++;
					gettingWires();
				} else {
					console.log(numOfPage, 'Error', response.statusCode);
					numOfPageTemp = 1;
					minPrice = 0.01;
					maxPrice = 1;
					numOfPageTemp = 1;
					multiplier = 0;
					numOfPage = 0;
				}
			}
		);
	}, timeout);
};









// Поиск цены самого дорогого конденсатора для дальнейшего использования в качестве ограничителя диапазона всех элементов
// request({
// 		method: 'GET',
// 		url: url = 'https://www.chipdip.ru/catalog/aluminum-electrolytic-capacitors?sort=pricedown',
// 	},
// 	function(error, response, body) {
// 		if (!error && response.statusCode == 200) {
// 			let $ = cheerio.load(response.body);
// 			absPrice = $('.price').text();
// 			absPrice = absPrice.replace('руб.', '');
// 			absPrice = absPrice.substring(0, absPrice.indexOf('руб.'));
// 			absPrice = absPrice.replace(' ', '');
// 			absPrice = parseFloat(absPrice);
// 			console.log('absPrice:', absPrice);
// 		} else {
// 			console.log(response.statusCode);
// 		}
// 		selectCapacitors();
// 	}
// );