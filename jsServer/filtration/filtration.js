this.capacitors = function(parameters, dataBaseElements) {
	/*for (let i = dataBaseElements.capacitors.length - 1; i >= 0; i--)
	{
	    if (dataBaseElements.capacitors[i].U < parameters.U2) {dataBaseElements.capacitors.splice(i,1);}
	}*/
	return dataBaseElements;
}
this.diodes = function(parameters, dataBaseElements) {
	// for (let i = dataBaseElements.diodes.length - 1; i >= 0; i--) {
	// 	if (dataBaseElements.diodes[i].fmax * 1000 < parameters.f1) {
	// 		dataBaseElements.diodes.splice(i, 1);
	// 	}
	// }
	return dataBaseElements;
}