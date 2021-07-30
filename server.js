const host = '127.0.0.1';
const port = 3000;
const express = require("express");
const fs = require("fs");
const app = express();
const bodyParser = require("body-parser");
const request = require('request');

let dataBaseElements = [];

dataBaseLoading();

// Увеличение объема пересылки данных
app.use(bodyParser.json({
	limit: '8096mb',
	extended: true
}));
app.use(bodyParser.urlencoded({
	limit: '8096mb',
	extended: true
}));

// Подгрузка изображений
app.use(express.static('public'));

// Запрос html файла
app.get("/", (req, res) => {
	res.sendFile(__dirname + "/client/index.html");
})

// Запрос js файла
app.use("/\*.js", (req, res) => {
	res.sendFile(__dirname + '/client/' + req.baseUrl);
})

// Инициализация базы данных
function dataBaseLoading() {
	dataBaseElements = {
		'capacitors': JSON.parse(fs.readFileSync("dataBase/Capacitors.json", "utf8")),
		'diodes': JSON.parse(fs.readFileSync("dataBase/Diodes.json", "utf8")),
		'cores': JSON.parse(fs.readFileSync("dataBase/Cores.json", "utf8")),
		'coreMaterials': JSON.parse(fs.readFileSync("dataBase/CoreMaterials.json", "utf8")),
		'wires': JSON.parse(fs.readFileSync("dataBase/Wires.json", "utf8")),
		'wiresPrices': JSON.parse(fs.readFileSync("dataBase/wiresPrices.json", "utf8"))
	};

	// Объединение статических и динамических параметров магнитопроводов
	for (let i = 0; i < dataBaseElements.cores.length; i++) {
		for (let j = 0; j < dataBaseElements.coreMaterials.length; j++) {
			if (dataBaseElements.coreMaterials[j].name == dataBaseElements.cores[i].material) {
				dataBaseElements.cores[i].materialParams = dataBaseElements.coreMaterials[j];
				j = dataBaseElements.coreMaterials.length - 1;
			}
		}
	}

	// Объединение статических и динамических параметров проводов
	for (let i = 0; i < dataBaseElements.wires.length; i++) {
		for (let j = 0; j < dataBaseElements.wiresPrices.length; j++) {
			if (dataBaseElements.wiresPrices[j].d == dataBaseElements.wires[i].d) {
				dataBaseElements.wires[i].price = dataBaseElements.wiresPrices[j].price;
				dataBaseElements.wires[i].href = dataBaseElements.wiresPrices[j].href;
				j = dataBaseElements.wiresPrices.length - 1;
			}
		}
	}

	console.log('The database has loaded', '\n');
}

// Прослушка порта 3000
app.listen(port, host, () => {
	console.log(`Server listens http://${host}:${port} \n`);
})

// Ожидание запроса от клиента
app.post("/devices", (req, res) => {
	let {parameters} = req.body;
	for (let key in parameters) {
		parameters[key] = +parameters[key];
	}
	const scheme = require('./jsServer/schemes/scheme' + parameters.scheme);
	const devices = scheme.stage1(parameters, dataBaseElements);

	fs.writeFileSync('./dataBase/test/devices.json', JSON.stringify(devices));
	res.send(devices);
});

// Ожидание запроса от клиента
app.post("/similarDeivce", (req, res) => {
	let {parameters, simpleDevices, bestDevice} = req.body;
	for (let key in parameters) {
		parameters[key] = +parameters[key];
	}
	const scheme = require('./jsServer/schemes/scheme' + parameters.scheme);
	const similarDeivce = scheme.stage2(parameters, simpleDevices, bestDevice);

	fs.writeFileSync('./dataBase/test/similarDeivce.json', JSON.stringify(similarDeivce));
	res.send(similarDeivce);
});
