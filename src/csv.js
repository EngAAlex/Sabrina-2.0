import * as Papa from 'papaparse';

class CSV{

	defaultPapaConfig = {
			delimiter: "",	// auto-detect
			newline: "",	// auto-detect
			quoteChar: '"',
			escapeChar: '"',
			header: false,
			transformHeader: undefined,
			dynamicTyping: false,
			preview: 0,
			encoding: "",
			worker: false,
			comments: false,
			step: undefined,
			complete: undefined,
			error: undefined,
			download: false,
			downloadRequestHeaders: undefined,
			skipEmptyLines: false,
			chunk: undefined,
			fastMode: undefined,
			beforeFirstChunk: undefined,
			withCredentials: undefined,
			transform: undefined,
			delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP]
	}


	
	
	static async _getLocalData(localDataCallback){		
		this._importCSV("csv/local_data.csv", 
				{complete: function(results, file){
					localDataCallback(results);
				}});		 
	}

	static async _getOnaceData(localDataCallback){		
		this._importCSV("csv/onace.csv", 
				{complete: function(results, file){
					localDataCallback(results);
				}});		 
	}

	static async _getEuRatiosData(localDataCallback){		
		this._importCSV("csv/eu_ratios.csv", 
				{complete: function(results, file){
					localDataCallback(results);
				}});
	}
	
	static async _getAvailableGeoJSON(localDataCallback){		
		this._importCSV("geojson/geojson_manifest.csv", 
				{complete: function(results, file){
					localDataCallback(results);
				}});
	}
	
	/*static async _getAvailableModels(localDataCallback){		
		this._importCSV("csv/model_manifest.csv", 
				{complete: function(results, file){
					localDataCallback(results);
				}});
	}*/

	static async _getAvailableModelSignatures(localDataCallback){		
		this._importCSV("csv/model_manifest.csv", 
				{complete: function(results, file){
					localDataCallback(results);
				}});
	}
	
	static async _getAvailableLocations(localDataCallback){		
		this._importCSV("csv/location_manifest.csv", 
				{complete: function(results, file){
					localDataCallback(results);
				}});
	}	

	static async _loadJSONModel(model, file, modelCallback){
		this._importJSON("csv/models/"+model+"/"+file, (data) => {
				modelCallback(data);			
		});
	}
	
	/*static async _loadModel(model, modelCallback){
		this._importCSV("csv/models/"+model+".csv",{
			complete: function(results, file){
				modelCallback(results);
			}
		});
	}*/
	
	static async _loadLocation(location, locationCallback){
		this._importCSV("csv/locations/"+location+".csv",{
			complete: function(results, file){
				locationCallback(results);
			}
		});
	}	
	
	static async _loadGeoJSON(file, callback){
		this._importJSON("geojson/"+file+".geojson", (data) => {
				callback(data);
			}
		);
	}	
	
	static _syncLoadGeoJSON(file, callback){
		this._importJSON("geojson/"+file+".geojson", (data) => {
				callback(data);
			}
		);
	}		
		
	
	/*static async _getEuRatiosIntervalData(localDataCallback){		
		this._importCSV("csv/eu_ratios_intervals.csv", 
				{complete: function(results, file){
					let accu = [];
					accu.push(0);
					results.data.reduce(
							(ac, curr) => {
								let last = accu[accu.length - 1];
								accu.push(last + Number(curr));
								return ac + Number(curr);
							},
							0
					);
					localDataCallback(accu);
				}});

	}*/

	static async _importJSON(file, callback){
		var xhr = new XMLHttpRequest();
		xhr.open('GET', file, true);
		xhr.responseType = 'text';                
		//xhr.setRequestHeader('Access-Control-Allow-Origin','*');        

		xhr.onload = function(e) {
			//console.log(this.statusText);    
			callback(JSON.parse(
					this.responseText));		
		};

		xhr.onerror = function(err) {
			callback(err);
		}

		xhr.send(null);		
	}
	
	static async _importCSV(file, parseConfig = this.defaultPapaConfig){
		var xhr = new XMLHttpRequest();
		xhr.open('GET', file, true);
		xhr.responseType = 'arraybuffer';                
		//xhr.setRequestHeader('Access-Control-Allow-Origin','*');        

		xhr.onload = function(e) {
			//console.log(this.statusText);    
			Papa.parse(
					new File([this.response], ""), parseConfig);		
		};

		xhr.send(null);

	}

}

export default CSV ;