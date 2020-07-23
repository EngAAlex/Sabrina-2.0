import React, { Component/*, useState*/ } from 'react';
import ReactDOM from 'react-dom';
import ReactMapGL, { NavigationControl } from 'react-map-gl';
import { ArcLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import { hexbin } from 'd3-hexbin';
import { MapController, /*WebMercatorViewport,*/ log, createIterable } from '@deck.gl/core/'
import chroma from 'chroma-js';
import 'mapbox-gl/dist/mapbox-gl.css';
import { withStyles,Typography } from "@material-ui/core";
import { findNearest/*, isPointInPolygon */} from "geolib";
import { CSVDownload } from "react-csv";

import { AdvModelLoader, generateModelId } from './adv-models/adv_model_loader';
import CSV from './csv.js';
import { CtLayerCfg, /*LayersList,*/ } from './ct-layers';
import { TimelineSliderWGuidance as TimelineSlider } from './panels/timeline_slider';
import { DEFAULT_STRATEGY_OPTIONS, getSelectedGroupingStrategies } from "./grouping/Strategies.js";
import { LocalGeoJsonLayer } from "./layers/LocalGeoJsonLayer";
import { LocalHexagonLayer } from "./layers/LocalHexagonLayer";
import { getPointsCenter, getSuffixString, parseTimeline, greenScaleDomain, redScaleDomain, extractPosition, getRadiusInPixel, colorObjectsMatch } from './panels/utils'
import { LoadingAnimation } from './panels/loading_spinner';
import { AnalyticsTabs } from './panels/analytics_panel';
import { DetailsPanelBox } from './panels/sector_details';
import { LegendPaper } from './panels/legend-panel'
import { WelcomeDialog } from './panels/welcome'
//import { local } from 'd3';

const TOKEN = 'pk.eyJ1IjoidWJlcmRhdGEiLCJhIjoiY2pudzRtaWloMDAzcTN2bzN1aXdxZHB5bSJ9.2bkj3IiRC8wj3jLThvDGdA';

var loading_accu = {};
var adv_model_loading_accu = [];
var model_loading_accu = [];
var location_loading_accu = [];
var temp_location_list = [];
var geojson_loading_accu = [];
var number_of_models = 0;
var number_of_locations = 0;
var number_of_geojsons = 0;
var number_of_blueprints = 0;
var loaded_blueprints = 0;

var temp_overlap_map = new Map();

var inverseLocationIndex = new Map();

var country_boundaries;

//const worker = new Worker('/thread.worker.js');

const ANGLE_PADDING = 5;

export const MAP_VIS_STYLE = {
	hoverLabel: {
		position: 'absolute',
		padding: '4px',
		background: 'rgba(0, 0, 0, 0.7)',
		//maxWidth: '300px',
		zIndex: 9,
		pointerEvents: 'none',
		color: 'white'
	},
	labelText: {
		fontSize: '13px',
		color: 'white',
		whiteSpace: 'pre-wrap'
	},
};

export function localPointToHexbin({ data, radius, getPosition, localFirms, layerCfg, updateClickedSectors }, aggregationParams) {
	
	const {viewport/*, attributes*/} = aggregationParams;
	// (47.5, 13.5) center of austria

	// add world space coordinates to points
	const screenPoints = [];

	const centerLngLat = data.length ? getPointsCenter(data, aggregationParams) : null;

	// get hexagon radius in mercator world unit
	const radiusInPixel = getRadiusInPixel(radius, viewport, centerLngLat);

	const { iterable, objectInfo } = createIterable(data);
	for (const object of iterable) {

		objectInfo.index++;
		const position = getPosition(object, objectInfo);
		const arrayIsFinite = Number.isFinite(position[0]) && Number.isFinite(position[1]);
		if (arrayIsFinite) {
			screenPoints.push(
				Object.assign(
					{
						screenCoord: viewport.projectFlat(position)
					},
					object
				)
			);
		} else {
			log.warn('HexagonLayer: invalid position')();
		}
	}

	const newHexbin = hexbin()
		.radius(radiusInPixel)
		.x(d => d.screenCoord[0])
		.y(d => d.screenCoord[1]);

	const hexagonBins = newHexbin(screenPoints);

	hexagonBins.forEach((hex, index) => {		
		hex.forEach((firm, innerIndex) => {
			localFirms.get(parseInt(firm.firm_id)).hexCentroid = viewport.unprojectFlat([hex.x, hex.y]);
		});
	});

	return {
		hexagons: hexagonBins.map((hex, index) => ({
			position: viewport.unprojectFlat([hex.x, hex.y]),
			points: hex,
			index	
		})),
		radiusCommon: radiusInPixel
	};
}

const MAPVIS_INIT = {
	view: 'localView',
};

const MIN_ZOOM = 1, MAX_ZOOM = 20, ZOOM = 7;

//const ARC_LAUNCHER_INTERVAL = 50; // milliseconds
//const ARC_FLOW_VELOCITY = 3; // from 0 to 100
class MapVis extends Component {
	constructor(props) {
		super(props);
		let strategies = getSelectedGroupingStrategies();
		let radius = this._calcHexagonRadius(ZOOM, MIN_ZOOM, MAX_ZOOM);
		this.state = {
			model_loader: new AdvModelLoader(),
			currentTime: 0,
			hover: {
				x: 0,
				y: 0,
				hoveredObject: null
			},
			click: {
				x: 0,
				y: 0,
				clickedObject: null
			},
			maxStage: 6,
			regionalBins: {},
			localFirms: new Map(),
			displayedFirms: [],
			groupedValueStrats: strategies,
			smtCashFlows: [],
			models_data: [],
			adv_models: [],
			colorLegend: [],
			layerCfg: {
				view: MAPVIS_INIT.view,
				hexagonRadius: radius,
				aggregation: -1,
				localArcVisible: false,
				visible_models: [],
				currentGroupingStrategy: 0,
				selectedSectors: new Set(),
				currDate: 0,
				bundleEdges: true,
				clickedSectors: [],
				aggregationLayerOpacity: 0.8
			},
			timePoints: [],
			yearlyDataPoints: [],
			sectorizedDataPoints: [],
			viewState: {
				longitude: 13.2420508,
				latitude: 47.567685,
				zoom: ZOOM,
				minZoom: MIN_ZOOM,
				maxZoom: MAX_ZOOM,
				pitch: 0,
				bearing: 0
			},
			oenaceLevelOne: {},
			initFinished: false,
			mapStyle: 'mapbox://styles/mapbox/dark-v9',
			geojson: [],
			colorBins: {},
			loading_stage_text: "Loading...",
			show_modal: true
			//temp_overlap_map: new Map()
		};
		//this._increase();
	};

	/*_increase() {
		if(this.state.currentTime + ARC_FLOW_VELOCITY < 100){
			const t = (this.state.currentTime + ARC_FLOW_VELOCITY) % 100;
			this.setState({ currentTime: t});
			setTimeout(this._increase.bind(this), ARC_LAUNCHER_INTERVAL);
		}/
	};*/

	componentDidUpdate(prevProps) {
		// Typical usage (don't forget to compare props):
		/*if (this.props.userID !== prevProps.userID) {
		  this.fetchData(this.props.userID);
		}*/
		const { colorBins } = this.state;		
		const { props } = this.deckGL;
		if((props !== undefined && props.layers !== undefined && props.layers.length > 1)){
			var newBins = props.layers[1].getFillColorSortedBins();
			if(!colorObjectsMatch(colorBins, newBins))
				this.setState({...this.state, colorBins: newBins});
		}
	  }

	async componentDidMount() {
		console.log("loading data...");

		CSV._getAvailableGeoJSON((geojsons) => {
			this.setState({...this.state, loading_stage_text: "GeoJSON list updated"});
			console.log("GeoJSON list updated");
			number_of_geojsons = geojsons.data.length;
			for (var i in geojsons.data) {
				let json_name = geojsons.data[i][0];
				CSV._syncLoadGeoJSON(json_name, (data) => {
					//console.log("loading GeoJSON " + json_name);
					temp_location_list[geojson_loading_accu.length] = new Map();
					data.features.forEach((item, index) => {
						item.points = [];
						item.original_points = [];
						temp_location_list[geojson_loading_accu.length].set(item.properties.iso, item);
					});
					this._updateGeoJSONLoading(json_name, data);
				});
			}
		});
	}

	async _continueLoading() {

		CSV._getAvailableLocations((locations) => {
			this.setState({...this.state, loading_stage_text: "Location list updated"});
			console.log("Location list updated");
			number_of_locations = locations.data.length;
			for (var i in locations.data) {
				if(locations.data[i][0] === ""){
					number_of_locations--;
					continue;
				}
				this._loadLocationFromDisk(locations.data[i][0], (model_name, model) => {
					this._updateLocationLoading(model_name, model);
				});
			}

			CSV._getLocalData((localData) => {
				const {localFirms} = this.state;
				this.setState({...this.state, loading_stage_text: "Loading Micro Data"});
				//const localFirmIndicesObj = {};
				//var idx = 0;
				var jumps = 0;
				localData.data.forEach((row, index) => {
					//let completion = index/localData.data.length*100;				
					let regions = [];
					let firm_id = Number(row[0]);
					let lat = Number(row[1]);
					let lng = Number(row[2]);
					let edv_e1 = row[3];
					let name = row[4];
					let employees = Number(row[5]);
					if (row.length > 6)
						for (let i = 6; i < row.length; i++)
							regions[i - 6] = row[i];
					if (Number.isNaN(firm_id) || Number.isNaN(lat) || Number.isNaN(lng) || edv_e1 === undefined) {
						jumps++;
					} else {
						localFirms.set(firm_id, { name: name, employees: employees, latitude: lat, longitude: lng, firm_id: firm_id, edv_e1: edv_e1, edges: [], bilanzen: new Map(), regions: regions });
						//localFirms[firm_id/*.toString()*/] = {/*position:[lng, lat],*/ latitude: lat, longitude: lng, firm_id:firm_id, edv_e1: edv_e1, presence: [], bilanzen: new Map(), regions: regions};				
						//localFirmIndicesObj[firm_id.toString()] = idx++;
					}
				});
				console.log("Malformed records: " + jumps);
				
				console.log("complete local data");

				this.setState({...this.state, loading_stage_text: "Building Regional Index"});				

				var downloadDetected = false;
				var completion = 0;

				var localFirmsSize = localFirms.size;
				let counter = 0;

				localFirms.forEach((item, index) => {//rebuild index if needed
					if (item.regions.length < location_loading_accu.length) {
						downloadDetected = true;
						for (let level_index = item.regions.length; level_index < location_loading_accu.length; level_index++) {
							//location_loading_accu.forEach((level, level_index) => {					
							//if(item.regions[level_index] === undefined){
							/*let point = {latitude: item.latitude, longitude: item.longitude};
							while(!isPointInPolygon(point, country_boundaries))
								point = {latitude: Math.random()*2.63+46.38, longitude:Math.random()*7.63+9.53 };
							item.latitude = point.latitude;
							item.longitude = point.longitude;*/ //To randomize coordinates within Austria
							let nearest = findNearest(item, location_loading_accu[level_index].points);
							item.regions[level_index] = nearest.index;

							let newCompletion = (counter / localFirmsSize * 100).toFixed(0);
							if (newCompletion !== completion) {
								completion = newCompletion;
								console.log("Complete " + completion + "%");
							}
						}
					}
					counter++;
				});

				if (downloadDetected) {
					alert("New Regional data detected: please download new local data csv file. Loading will resume");
					this._prepareLocalDataFileWithRegions(localFirms);
				}
				
				//console.log(loading_stage_text);

				this._updateAndFinish({ geojson: geojson_loading_accu, localFirms: localFirms }); //localSelectedFirmsBySector

				CSV._getEuRatiosData((eu_ratios) => {
					this.setState({...this.state, loading_stage_text: "Loading Macro Data"});

					var timePointsSet = new Set();
					var jumps = 0;
					var valid = 0;
					eu_ratios.data.forEach(firm => {
						let firm_id = Number(firm[0]);
						let year = Number(firm[1]);
						let cash = Number(firm[2]);
						let avg = 0;
						if (isNaN(cash) || isNaN(year) || isNaN(firm_id))
							return;
						timePointsSet.add(year);
						let current_firm = localFirms.get(firm_id);
						if(current_firm !== undefined){
							try {
								current_firm.bilanzen.set(year, { cashFlow: cash });
								valid++;
							} catch (error) {
								jumps++;
							}
							if(current_firm.bilanzen.size > 0){
								avg = Array.from(current_firm.bilanzen.values()).reduce((total, curr) => {
									return total + Math.abs(curr.cashFlow);
								}, 0);
								avg = parseInt(Math.ceil(avg));							
							}
							current_firm.avg_finanzen = avg;
						}
					});

					console.log("Invalid data: " + (jumps / (jumps + valid) * 100).toFixed(0) + "%");
					let timePoints = Array.from(timePointsSet);
					timePoints.sort(function (a, b) {
						if (a > b) {
							return 1;
						}
						if (b > a) {
							return -1;
						}
						return 0;
					});
					console.log("complete eu ratios data");
					this._updateAndFinish({ timePoints: timePoints });

				});
				//});				

				CSV._getAvailableModelSignatures(
					async (result) => {
						this.setState({...this.state, loading_stage_text: "Signature list updated"});
						console.log("Signature list updated");
						number_of_blueprints = result.data.length;
						for (var i in result.data) {
							AdvModelLoader._loadModelSignature(result.data[i][0], (model_name, signature) => {
								this._updateAdvModelLoading(model_name, signature);
							});
						}
					}
				);

				/*CSV._getAvailableModels( 
					async (result) => {
						loading_stage_text = "Models list updated";
						console.log("Models list updated");
						number_of_models = result.data.length;
						for (var i in result.data) {
							this._loadModelFromDisk(result.data[i][0], (model_name, model) => {
								this._updateModelLoading(model_name, model);
							});
						}
					}
				);*/

			});

			//});
		});

		CSV._getOnaceData((oenace) => {
			this.setState({...this.state, loading_stage_text: "Loading Sector Data"});

			var oenaceLevelOne = [];
			var selectedSectors = new Set();
			oenace.data.forEach(sec => {
				selectedSectors.add(sec[0]);
				oenaceLevelOne[sec[0]] = sec[1];
			});
	
			console.log("complete oenace data");
			this._updateAndFinish({ selectedSectors: selectedSectors, oenaceLevelOne: oenaceLevelOne });
		});

	};

	_setUpdateCounter = (newCounter) => {
		this.setState({ ...this.state, maxStage: newCounter });
	}

	_updateAndFinish = (newState) => {

		loading_accu = { ...loading_accu, ...newState, initStage: (loading_accu.initStage === undefined ? 1 : ++loading_accu.initStage) };

		//this.setState({... newState, initStage: (this.state.initStage === undefined ? 1 : ++this.state.initStage)});
		//console.log("Init in progress " + loading_accu.initStage);

		if (loading_accu.initStage === this.state.maxStage)
			this._completeInit();

	};

	_completeInit = () => {
		let layerCfg = { ...this.state.layerCfg, selectedSectors: loading_accu.selectedSectors, currDate: loading_accu.timePoints[0] };
		this.setState({...this.state, loading_stage_text: "All Data Loaded -- Cleaning"}, () => {
			let keysToRemove = [];
			loading_accu.localFirms.forEach((item, index) => {
				if(item.bilanzen.size === 0)
					keysToRemove.push(index);
			});
			keysToRemove.forEach((item, key) => {
				loading_accu.localFirms.delete(item);
			});

			////IS THIS PART REDUNDANT?

			loading_accu.locations_data.forEach((level, level_index) => {
				loading_accu.localFirms.forEach((item, index) => {
					var geojsonelement = temp_location_list[level_index].get(item.regions[level_index]);//temp_location_list[level_index][item.regions[level_index]];
					if (geojsonelement.original_points === undefined)
						geojsonelement.original_points = [];
					geojsonelement.original_points.push(item);
					//temp_location_list[level_index].set(item.regions[level_index], geojsonelement);
				});
			});

			temp_location_list.forEach((level, level_index) => {
				level.forEach((value, key) => {
					geojson_loading_accu[level_index].data.firms = value.firms;
				});
			});

			///// END OF POTENTIAL REDUNDANCY
		});

		this.setState({...loading_accu, loading_stage_text: "All Data Loaded -- Finalizing", 
			yearlyDataPoints: undefined,  
			layerCfg: layerCfg}
			, () => {
					let displayedFirms = this._updateDisplayedFirms();
					let sectorizedDataPoints = this._getSectorizedPointsOutOfMetric(displayedFirms);
					let yearlyPoints = this._getYearlyPointsOutOfMetric(displayedFirms);
					this.setState({...this.state, initStage: 0, initFinished: true, 
						displayedFirms: displayedFirms, yearlyDataPoints: yearlyPoints, sectorizedDataPoints: sectorizedDataPoints});
				}
			);
			/*GetYearlyPointsOutOfMetric( loading_accu.localFirms, loading_accu.timePoints, layerCfg, getSelectedGroupingStrategies()[0] )
					.then((data) => this.setState({...this.state, yearlyDataPoints: data}))
					.finally(this._clearAccus());*/
		//this.setState({ ...this.state, /* sectorizedDataPoints: this._getSectorizedPointsOutOfMetric(),*/ yearlyDataPointsyearlyDataPoints: undefined, initStage: 0, initFinished: true, layerCfg: {...this.state.layerCfg, selectedSectors: loading_accu.selectedSectors, currDate: loading_accu.timePoints[0] }});
		//GetYearlyPointsOutOfMetricWithWWorkers(loading_accu.localFirms, loading_accu.timePoints, layerCfg, 0);
		console.log("init complete");
	};

	_addNewModel = (newModel, visible_models = undefined) => {
		const{layerCfg, localFirms, adv_models, model_loader} = this.state;
		let sw_string = generateModelId(newModel.switches);
		let vm = visible_models === undefined ? layerCfg.visible_models : visible_models;
		this.setState({...this.state, layerCfg: {...layerCfg, visible_models: vm, model_selector: {}}, loading_stage_text: "Loading Model " + newModel.name, initFinished: false},
		() => {
			const {layerCfg} = this.state;
			model_loader._loadSingleModel(localFirms, newModel.name, sw_string, adv_models[newModel.name].files[sw_string], (modelStats) => {
				let visible_models = layerCfg.visible_models;
				if(visible_models[newModel.name] === undefined)
					visible_models[newModel.name] = [];
				let nextId = Number.MIN_SAFE_INTEGER;
				for(let i in visible_models[newModel.name]){
					if(visible_models[newModel.name][i] === undefined)
						continue;
					let str = visible_models[newModel.name][i].name;
					let cfr = parseInt(str.slice(str.indexOf('('), str.length - 1));
					nextId = Math.max(cfr, nextId);
				}
				if(nextId === Number.MIN_SAFE_INTEGER)
					nextId = 0;
				else
					++nextId;
				visible_models[newModel.name][generateModelId(newModel.switches)] = 
					{modelStats:modelStats, active: true, name: newModel.name + "(" + Object.entries(layerCfg.visible_models[newModel.name]).length   + ")"};
				this._updateLayerCfg({...layerCfg, visible_models: visible_models}, {invalidateOverlapMap: true, transactionsRecomputed: true});
				this.setState({...this.state, initFinished: true});
			}, this._updateLoadingText);
		});
	}

	_updateLocationLoading = (location_name, locationsData) => {
		this.setState({...this.state, loading_stage_text: "Loaded Location " + location_name + " -- Loaded " + (location_loading_accu.length + 1) + " location out of " + number_of_locations});
		//console.log(loading_stage_text);
		location_loading_accu[location_loading_accu.length] = { location_name: location_name, points: locationsData, centroids: inverseLocationIndex  }
		inverseLocationIndex = new Map();
		if (location_loading_accu.length === number_of_locations) {
			this._updateAndFinish({ locations_data: location_loading_accu });
		}

	};

	_updateGeoJSONLoading = (json_name, geojsondata) => {
		this.setState({...this.state, loading_stage_text: "Loaded GeoJSON " + json_name + " -- Loaded " + (geojson_loading_accu.length + 1) + " location out of " + number_of_geojsons});

		//console.log(loading_stage_text);
		geojson_loading_accu[geojson_loading_accu.length] = { json_name: json_name, data: geojsondata}
		if (geojson_loading_accu.length === number_of_geojsons) {
			this._updateAndFinish({ geojson: {} });
			this._continueLoading();
			/*CSV._loadGeoJSON("Austria_country", (data) => { // to randomize coordinates within Austria
				country_boundaries = data["features"][0].geometry.coordinates[0].map(d => {return {latitude: d[1], longitude: d[0]}});
				console.log("Loading Austria Boundaries and continuing");
				this._updateAndFinish({ geojson: {} });
				this._continueLoading();
			});*/
		}

	};
	
	_updateAdvModelLoading = (signature) => {
		adv_model_loading_accu[signature.name] = signature;
		loaded_blueprints++;
		this.setState({...this.state, loading_stage_text: "Loaded "+ signature.name + " signature -- " + (number_of_blueprints - loaded_blueprints) + " to go"});
		//console.log(loading_stage_text);
		if (loaded_blueprints === number_of_blueprints) {
			this._updateAndFinish({adv_models: adv_model_loading_accu});
		}
	};

	_updateModelLoading = (model_name, newModel) => {
		this.setState({...this.state, loading_stage_text: "Loaded Model " + model_name + " -- Loaded " + (model_loading_accu.length + 1) + " models out of " + number_of_models});

		//console.log(loading_stage_text);
		model_loading_accu[model_loading_accu.length] = model_name; //{ name: model_name, data: newModel };
		if (model_loading_accu.length === number_of_models) {
			this._updateAndFinish({ models_data: model_loading_accu });
		}

	};

	_updateLoadingText = (updLoadingText) => {
		this.setState({...this.state, loading_stage_text: updLoadingText});
	}

	_clearAccus = () => {
		loading_accu = {};
		adv_model_loading_accu = [];
		model_loading_accu = [];
		location_loading_accu = [];
		temp_location_list = [];
		geojson_loading_accu = [];	
	};

	_onHover = ({ x, y, object, layer }) => {
		const { classes } = this.props;
		const { layerCfg, localFirms, groupedValueStrats, displayedFirms } = this.state;
		if (object) {
			let contents = groupedValueStrats[layerCfg.currentGroupingStrategy].getLabel(object, localFirms, layerCfg, displayedFirms);
			let label;
			if(typeof contents === "string")
				label = <Typography className={classes.labelText}>{contents}</Typography>;
			else{
				label =  (
						<div className={classes.labelText}>
							{contents}
						</div>
					);
			}
			this.setState({
				hover: {
					x, y, hoveredObject: object, label: label
				}
			});
		} else
			this.setState({ hover: { x, y, hoveredObject: object, label: null } });
	}

	_onArcHover = ({ x, y, object, layer }) => {
		const { layerCfg } = this.state;
		const { classes } = this.props;
		if (object) {
			let label = "";
			if(layerCfg.bundleEdges){
				let val = getSuffixString(object.aggregateData.amount);
				label = (
					<Typography className={classes.labelText}>
						Bundled Transactions: {Math.max(object.aggregateData.ids_from.length, object.aggregateData.ids_to.length)}<br/>
						Total Amount: {val[0]+val[1]}
					</Typography>
				);
			}else{
				let suffix = getSuffixString(object.amount);
				label = 
			(<Typography className={classes.labelText}>Transaction from<br/>
				{object.fromName} (id: {object.from.firmId}, sector: {object.fromSector})<br/>to<br/>{object.toName} (id: {object.to.firmId}, sector: {object.toSector}): {suffix[0]}{suffix[1]}
				<br/>Model: {object.model_name}</Typography>);	
				/*label = 
					(<Typography className={classes.labelText}>Transaction from {object.from.firmId} ({localFirms.get(parseInt(object.from.firmId)).edv_e1}) to {object.to.firmId} ({localFirms.get(parseInt(object.to.firmId)).edv_e1}): {suffix[0]}{suffix[1]}
					<br/>Model: {object.model_name}</Typography>);*/
			}
			this.setState({ hover: { x, y, hoveredObject: object, label: label } });
		} else
			this.setState({ hover: { x, y, hoveredObject: object, label: null } });
	}

	_onClick = ({ x, y, object, layer }) => {
		const { layerCfg } = this.state;
		if (object) {
			let index = object.properties === undefined ? object.position[0]+"-"+object.position[1] : object.properties.iso;
			let clickedSectors = layerCfg.clickedSectors;
			if(clickedSectors[index.toString()] === undefined){		
				//this.setState({ click: { x, y }, layerCfg: {...layerCfg}});
				clickedSectors[index.toString()] = object.points;
			}
			else{
				clickedSectors[index.toString()] = undefined;
			}
			temp_overlap_map.clear();
			this._recoverEdges(clickedSectors);
		} else {
			this.setState({ click: { x, y } });
			//this.state.smtCashFlows = {};
			this._clearClickAndHover();
		}
		//temp_overlap_map = undefined;
		//}
	};

	_prepareLocalDataFileWithRegions = async (localFirms) => {
		var finalString = "data:text/csv;charset=utf-8,";
		localFirms.forEach((item, index) => {
			finalString += item.firm_id + "," + item.latitude + "," + item.longitude + "," + item.edv_e1 + ",\"" + item.name + "\"," + item.employees;
			item.regions.forEach((region, regionIndex) => {
				finalString += "," + region;
			});
			finalString += "\n";
		});
		let link = (<CSVDownload
			data={finalString}
			filename={"my-file.csv"}
			target="_blank">Download me</CSVDownload>);

		ReactDOM.render(link, document.querySelector('#download'));
	}

	_loadLocationFromDisk = async (locationLabel, callback) => {
		await CSV._loadLocation(locationLabel, (data) => {
			var location_level = [];
			data.data.forEach(function (row, idx) {
				let index = row[0];
				let name = row[1];
				let lat = Number(row[row.length - 2]);
				let lon = Number(row[row.length - 1]);
				if (isNaN(lon) || isNaN(lat))
					return;
				location_level.push({ index: index, name: name, latitude: lat, longitude: lon, firms: [] });
				inverseLocationIndex.set(index, [lon, lat]);
			});
			callback(locationLabel, location_level);
		});
	}

	_recoverEdges = (clickedSectors) => {
		let { localFirms, layerCfg, displayedFirms } = this.state;

		var tempflowVecs = [];
		var flowVecs = [];

		var maxFlow, minFlow, intFlow = 0, totalFlowNum,/* totalFlowAbs,*/ unbundled = undefined;

		let points = [];

		for(let i in clickedSectors)
			if(clickedSectors[i] !== undefined)
				points = points.concat(clickedSectors[i]);			
		
		/*if (!object) { 
			object = this.state.clickedObject;
		} else {*/
			tempflowVecs = getFlowsFromEdges(points, layerCfg.visible_models, parseTimeline(layerCfg.currDate).year, localFirms, displayedFirms, layerCfg.aggregation, layerCfg.clickedSectors);
			if (tempflowVecs.data.length > 0) {
				if(layerCfg.bundleEdges){
					let edgeRegistry = new Map();
					unbundled = tempflowVecs;
					flowVecs = [];
					tempflowVecs.data.forEach((edge, index) => {
						let sourceFirm = localFirms.get(parseInt(edge.from.firmId));
						let targetFirm = localFirms.get(parseInt(edge.to.firmId));
						let source = this._getCentroidForEdgeBundling(sourceFirm);
						let sink = this._getCentroidForEdgeBundling(targetFirm);
						if(source === undefined || sink === undefined){
							console.log("Skipped edge " + source + " " + sink);
							console.log("\t because source " + (source === undefined ? "is" : "is not") + "undefined and sink" + (sink === undefined  ? "is" : "is not"));
							return;
						}
						let sourceId = this._createTempId(source);
						let sinkId = this._createTempId(sink);
						if(!edgeRegistry.has(sourceId))
							edgeRegistry.set(sourceId, new Map());
						let currentEdgePage = edgeRegistry.get(sourceId);
						if(!currentEdgePage.has(sinkId))
							currentEdgePage.set(sinkId, {signed_amount: 0, amount: 0, model_names: [], model_idxs: [], sector_map_from: [], sector_map_to: [], ids_from: [], ids_to: []});	
						let currentEdgeValue = currentEdgePage.get(sinkId);
						currentEdgeValue.amount += edge.amount;
						currentEdgeValue.signed_amount += edge.signed_amount;
						let sector_map_from = currentEdgeValue.sector_map_from;
						let sector_map_to = currentEdgeValue.sector_map_to;
						let model_idxs = currentEdgeValue.model_idxs;
						let model_names = currentEdgeValue.model_names;
						let ids_from = currentEdgeValue.ids_from;
						let ids_to = currentEdgeValue.ids_to;
						if(sector_map_from[sourceFirm.edv_e1] === undefined)
							sector_map_from[sourceFirm.edv_e1] = 0
						sector_map_from[sourceFirm.edv_e1] += edge.amount;
						if(sector_map_to[targetFirm.edv_e1] === undefined)
							sector_map_to[targetFirm.edv_e1] = 0
						sector_map_to[targetFirm.edv_e1] += edge.amount;
						if(model_idxs[edge.model_idxs] === undefined){
							model_idxs[edge.model_idx] = 0
							model_names[edge.model_name] = 0
						}
						model_idxs[edge.model_idx] += 1;
						model_names[edge.model_name] += 1;
						ids_from.push(edge.from.firmId);
						ids_to.push(edge.to.firmId);
					});

					maxFlow = Number.MIN_SAFE_INTEGER;
					minFlow = Number.MAX_SAFE_INTEGER;

					edgeRegistry.forEach((element, index) => {
						var coords_from = this._reverseTempId(index);
						element.forEach((aggregateData, innerindex) =>{
							let coords_to = this._reverseTempId(innerindex);
							maxFlow = Math.max(maxFlow, aggregateData.amount);
							minFlow = Math.min(minFlow, aggregateData.amount);
							let topSendersString = "";		
							let topRecvString = "";
							totalFlowNum += aggregateData.amount;

							let internal = coords_from[0] === coords_to[0] && coords_from[1] === coords_to[1];

							if(internal)
								intFlow += aggregateData.amount;

							Object.keys(aggregateData.sector_map_from).sort(function (a,b) {
								if(a === b || aggregateData.sector_map_from[a] === aggregateData.sector_map_from[b])
									return 0;
								if(aggregateData.sector_map_from[a] < aggregateData.sector_map_from[b])
									return 1;
								else return -1;
							}).forEach(function(key) {
								let counter = 0;
								if(counter === 2 || key === undefined || aggregateData.sector_map_from[key] === undefined)
									return;
								let val = parseInt(aggregateData.sector_map_from[key]/aggregateData.amount*100);
								if(val >= 10)
									topSendersString += key + " (" + val + "%) ";
								counter++;
							});
							
							Object.keys(aggregateData.sector_map_to).sort(function (a,b) {
								if(a === b || aggregateData.sector_map_to[a] === aggregateData.sector_map_to[b])
									return 0;
								if(aggregateData.sector_map_to[a] < aggregateData.sector_map_to[b])
									return 1;
								else return -1;
							}).forEach(function(key) {
								let counter = 0;
								if(counter === 2 || key === undefined || aggregateData.sector_map_to[key] === undefined)
									return;
								let val = parseInt(aggregateData.sector_map_to[key]/aggregateData.amount*100);
								if(val >= 10)
									topRecvString += key + " (" + val + "%) ";
								counter++;
							});

							flowVecs.push({
									from: {
										firmId: aggregateData.ids_from,
										position: coords_from
									},
									to: {
										firmId: aggregateData.ids_to,
										position: coords_to,
									},
									internal: coords_from[0] === coords_to[0] && coords_from[1] === coords_to[1],
									amount: aggregateData.amount,
									aggregateData: aggregateData,
									edgeId: coords_from + "_" + coords_to,
									bundleSize: Math.max(aggregateData.ids_from.length, aggregateData.ids_from.length),
									no_models: Object.entries(aggregateData.model_names).length, 
									top_senders: topSendersString,
									top_receiv: topRecvString									
								}
							);
						});
					});
				}else{
					minFlow = tempflowVecs.minFlow;
					maxFlow = tempflowVecs.maxFlow;
					totalFlowNum = tempflowVecs.totalFlow;
					flowVecs = tempflowVecs.data;
					intFlow = tempflowVecs.internalFlow;
				}

				
				var greenScale = chroma.scale(greenScaleDomain).domain([minFlow, maxFlow]);
				var redScale = chroma.scale(redScaleDomain).domain([minFlow, maxFlow]);

				//var matching = /\d+/g;
				/*flowVecs.forEach(a => {
					a.targetColor = greenScale(a.amount).rgb();
					a.sourceColor = redScale(a.amount).rgb();
				});*/

				/* #####TESTING REACT-VIS LIGHTER COLOR LEGEND
				let colorLegend = {}
				colorLegend.min = minFlow;
				colorLegend.max = maxFlow;
				colorLegend.num_bins = 5;
				this.state.layerCfg.colorLegend = colorLegend; 
				*/

				this.setState({ ...this.state, 
					layerCfg: {...layerCfg, clickedSectors: clickedSectors}, 
					colorLegend: [minFlow, maxFlow], 
					colorScales: {green: greenScale, red: redScale}, 
					smtCashFlows: {...tempflowVecs, internalFlow: intFlow, minFlow: minFlow, maxFlow: maxFlow, data: flowVecs, unbundled: unbundled },
				});

				var x = this.state.click.x;
				var y = this.state.click.y;
				//this.setState({ click: { x, y, clickedObject: object, label: label } });
			} else {
				//this.state.smtCashFlows = {};
				this.setState({ ...this.state, click: { x, y },
					layerCfg: {...layerCfg, clickedSectors: clickedSectors},
					colorLegend: [], 
					colorScales: {}, 
					smtCashFlows: {},
				});
			}
		//}
	};

	_updateLayerCfg = (layerCfg, options) => {
		const {groupedValueStrats} = this.state;
		const {updateColorValues, updateDisplayedFirms, clearClick, invalidateOverlapMap, transactionsRecomputed, clearClickIfProximity} = options;
		this.setState({...this.state, initFinished: false, loading_stage_text: "Updating View", layerCfg: layerCfg, initFinished: layerCfg.showSpinner === undefined || !layerCfg.showSpinner }, () => {
			const {displayedFirms} = this.state;
			let updatePackage = {initFinished: true};
			let currentDisplayedFirms = displayedFirms; 
			if(updateDisplayedFirms || (transactionsRecomputed && groupedValueStrats[layerCfg.currentGroupingStrategy].dependsOnTransactions)){
				currentDisplayedFirms = this._updateDisplayedFirms();
				updatePackage.displayedFirms = currentDisplayedFirms;
				updatePackage.sectorizedDataPoints = this._getSectorizedPointsOutOfMetric(currentDisplayedFirms);
				temp_overlap_map.clear();
			}
			if (updateColorValues || updateDisplayedFirms || (transactionsRecomputed && groupedValueStrats[layerCfg.currentGroupingStrategy].dependsOnTransactions)){
				updatePackage.yearlyDataPoints = this._getYearlyPointsOutOfMetric(displayedFirms);
			}
			if (invalidateOverlapMap){
				temp_overlap_map.clear();
				updatePackage = {...updatePackage, selectedTransaction: undefined};
			}
			if(clearClick || (clearClickIfProximity && layerCfg.aggregation === -1)){
				temp_overlap_map.clear();
				this.setState({...this.state, ...updatePackage, layerCfg: {...layerCfg, selectedTransaction: undefined, clickedSectors: [] }}, () => {
					this._onViewOptionChange(null);
				});
			}else
				this.setState({...this.state, ...updatePackage, }, () => {
					if (Object.entries(layerCfg.clickedSectors).length > 0)
						this._recoverEdges(layerCfg.clickedSectors);
				});					
		});
	};

	_clearClickAndHover() {
		this.setState({
			...this.state,
			smtCashFlows: [],
			hover: {
				x: 0,
				y: 0,
				hoveredObject: null
			},
			click: {
				x: 0,
				y: 0,
				clickedObject: null
			}
		});
	};

	_onMapStyleChange = (event) => {
		this.setState({ mapStyle: event.target.value });
	};

	_onViewOptionChange = async (event) => {
		//let layerCfg = this.state.layerCfg;
		//const currView = event === null ? layerCfg.view : event.target.value;
		if (event !== null/* && currView === layerCfg.view*/) {
			return;
		}
		/*const currLayerCfg = {
				... layerCfg,
				view: currView
		};*/
		this._clearClickAndHover();
		//this._updateDisplayedFirms(layerCfg);
	};


	_calcHexagonRadius = (zoom, minZoom, maxZoom) => {
		const minHexRadius = 25, maxhexRadius = 6000;
		let scaleChange = (maxZoom - zoom) / (maxZoom - minZoom);
		let hexRadius = Math.round(scaleChange ** 3 * (maxhexRadius - minHexRadius) + minHexRadius);
		return (hexRadius - hexRadius % minHexRadius);
	};

	_onViewStateChange = ({ viewState }) => {
		if (viewState.zoom < viewState.minZoom || viewState.zoom > viewState.maxZoom) {
			return;
		}
		this.setState({ viewState: viewState });
	}

	/*_computeArcHeight = (d) => {
		const {layerCfg} = this.state;
			if(d.edgeId === layerCfg.selectedTransaction)
				return 3;
			return 1;
	}*/

	_getArcSourceColor = (d) => {
		const {colorScales, layerCfg} = this.state;
		if(d.edgeId === layerCfg.selectedTransaction)
			return chroma('#dd3497').rgb();
		/*if(d.signed_amount < 0 || d.aggregateData.signed_amount < 0)*/
			return colorScales.red(d.amount).rgb();
		/*else
			return colorScales.green(d.amount).rgb();*/
	}

	_getArcTargetColor = (d) => {
		const {colorScales, layerCfg} = this.state;
		if(d.edgeId === layerCfg.selectedTransaction)
			return chroma('#225ea8').rgb();
		/*if(d.signed_amount < 0 || d.aggregateData.signed_amount < 0)
			return colorScales.red(d.amount).rgb();
		else*/
		return colorScales.green(d.amount).rgb();	}

	render() {
		const { classes } = this.props;
		const { loading_stage_text, viewState, adv_models, locations_data, oenaceLevelOne, 
				hover, layerCfg, initFinished, localFirms, geojson, timePoints, groupedValueStrats,
				sectorizedDataPoints, yearlyDataPoints, colorLegend, smtCashFlows, colorBins, displayedFirms, show_modal } = this.state;
		const { bundleEdges } = layerCfg
		// const currentT = Math.floor((Date.now() / 10) % 100)/100;
		var layers = [];
		let aggregatedLayer;
		
		// let arcs = smtCashFlows.data;
		// let internalMovements;

		// if(bundleEdges && smtCashFlows.data !== undefined){
		// 	internalMovements = [];
		// 	arcs = smtCashFlows.data.filter((d, index) =>  {
		// 		if(d.from.position[0] == d.to.position[0] && d.from.position[1] == d.to.position[1]){
		// 			internalMovements.push(d);
		// 			return false;
		// 		}
		// 		return true;
		// 	});
		// }

		if (displayedFirms.length > 0 /*&& localFirms.size > 0 && layerCfg.selectedSectors.size > 0*/) {
			layers.push(
				new ArcLayer({
					id: 'local-cash-flow-arch',
					data: smtCashFlows.data,
					widthUnits: 'pixels',
					pickable: true,
					getWidth: 12, //d => Math.round(linearMapping(smtCashFlows.domain, LOCAL_ARC_WIDTH_RANGE, d.amount)),
					selectedTransaction: layerCfg.selectedTransaction,
					getSourcePosition: d =>
						d.from.position,
					getTargetPosition: d =>
						d.to.position,
					getSourceColor: (d) => this._getArcSourceColor(d),
					getTargetColor: (d) => this._getArcTargetColor(d),
					onHover: hover => this._onArcHover(hover),
					getTilt: (current, overlaps) => this._getTilt(current, overlaps),
				}));
			
			if (layerCfg.aggregation >= 0) {
				let currentAggregationGeoJSON = geojson[layerCfg.aggregation];
				aggregatedLayer = 
					new LocalGeoJsonLayer({
						id: currentAggregationGeoJSON.json_name + '-geojson',
						data: currentAggregationGeoJSON.data,
						displayedFirms: displayedFirms,
						opacity: layerCfg.aggregationLayerOpacity,
						localFirms: localFirms,
						timePoints: timePoints,
						//currDate: layerCfg.currDate,
						colorPalette: groupedValueStrats[layerCfg.currentGroupingStrategy].getColorDomain(),
						layerCfg: layerCfg,
						clickedSectors: layerCfg.clickedSectors,
						//models_data: models_data,
						//timelineOption: layerCfg.timelineOption,						
						pickable: true,
						stroked: true,
						filled: true,
						extruded: false,
						autoHighlight: true,
						lineWidthScale: 20,
						lineWidthMinPixels: 2,
						getColorValue: (filteredPoints) =>  this._getSectorColorValue(filteredPoints),
						//filterFunction: groupedValueStrats[layerCfg.currentGroupingStrategy].filterFunction,
						getFillColor: cell => { return cell.color; },
						getRadius: 100,
						getLineWidth: 1,
						onHover: info =>
							this._onHover(info),
						onClick: info => this._onClick(info),
						updateTriggers: {
							getFillColor: { layerCfg }
						},
					});
			} else {
				aggregatedLayer =
					new LocalHexagonLayer({
						id: 'local-hexagon',
						hexagonAggregator: localPointToHexbin,
						colorRange: groupedValueStrats[layerCfg.currentGroupingStrategy].getColorDomain(),
						data: displayedFirms,
						coverage: 0.94,
						opacity: layerCfg.aggregationLayerOpacity,
						getPosition: (d) => extractPosition(d),
						pickable: true,
						autoHighlight: true,
						extruded: false,
						stroked: true,
						radius: layerCfg.hexagonRadius * 5,
						getColorValue: (filteredPoints) => this._getSectorColorValue(filteredPoints),
						//getElevationValue: (filteredPoints) => { return this._sectorClicked(filteredPoints); },
						//elevationDomain: [0, 12],
						//elevationRange: [1, 12000],
						//filterFunction: groupedValueStrats[layerCfg.currentGroupingStrategy].filterFunction,
						layerCfg: layerCfg,
						localFirms: localFirms,
						clickedSectors: layerCfg.clickedSectors,						
						material: false,
						onSetColorDomain: (domain) => {
							domain[0] = 0;
						},
						onHover: info => this._onHover(info),
						onClick: info => this._onClick(info),
						updateTriggers: {
							getFillColor: { layerCfg }
						},
					});
			}
			layers.push(aggregatedLayer);
		}
		/*let loader = (<div></div>);
		if (!initFinished)*/

		let selectedSectorsCount = Object.entries(layerCfg.clickedSectors).reduce((total, current, index) => {return total + (current[1] === undefined ? 0 : 1);}, 0);
		let detailsPanelBox = selectedSectorsCount === 0 ? ("") :
								(<DetailsPanelBox
									colorLegend={colorLegend}
									transactions={smtCashFlows}
									clearSelection={() => {this._updateLayerCfg(layerCfg, {clearClick: true}); }}
									selectedCount={selectedSectorsCount}
								/>);
		return (
				<div onContextMenu={event => event.preventDefault()}>
					{hover.hoveredObject && (
						<div
							className={classes.hoverLabel}
							style={{ transform: `translate(${hover.x}px, ${hover.y}px)` }}
						>
							{hover.label}
						</div>
					)}
				<WelcomeDialog
					open={show_modal}
					onClose={() => this.setState({...this.state, show_modal: false})}
				/>
				<LoadingAnimation 
					active={!initFinished}
					loading_label={loading_stage_text}
				/>
				<CtLayerCfg
					locations={locations_data}
					layerCfg={layerCfg}
					groupingStrategies={groupedValueStrats}
					mapStyle={this.state.mapStyle}
					oenaceLevelOne={oenaceLevelOne}
					onLayerCfgChange={(layerCfg, options) => this._updateLayerCfg(layerCfg, options)}
					onMapStyleChange={event => this._onMapStyleChange(event)}
					onViewOptionChange={event => this._onViewOptionChange(event)}
					sectorizedDataPoints={sectorizedDataPoints}
					disabledTransactionFilter={groupedValueStrats[layerCfg.currentGroupingStrategy].dependsOnTransactions}
					colorsArray={Array.from(groupedValueStrats[layerCfg.currentGroupingStrategy].getColorDomain())}
				/>
				<DeckGL
					ref={deck => { this.deckGL = deck; }}
					onWebGLInitialized={this._onWebGLInitialize}
					layers={layers}
					viewState={viewState}
					onViewStateChange={({ viewState }) => this._onViewStateChange({ viewState })}
					controller={{ type: MapController }}
				>
					<ReactMapGL
						mapboxApiAccessToken={TOKEN}
						mapStyle={this.state.mapStyle}
					>
						<div style={{ position: 'absolute', left: '13px', top: '13px' }}>
							<NavigationControl showZoom={false} />
						</div>
					</ReactMapGL>
				</DeckGL>
				<TimelineSlider
					layerCfg={layerCfg}
					timePoints={timePoints}
					dataPoints={yearlyDataPoints}
					onLayerCfgChange={(layerCfg, refresh) => this._updateLayerCfg(layerCfg, refresh)}
				/>
				{detailsPanelBox}
				<AnalyticsTabs 
					transactions={smtCashFlows}
					localFirms={localFirms}
					adv_models={adv_models}
					clickedSectors={layerCfg.clickedSectors}
					colorLegend={colorLegend}
					addNewModel={this._addNewModel}
					layerCfg={layerCfg}
					updateLayerCfg={(layerCfg, options) => this._updateLayerCfg(layerCfg, options)}
					selectedStrategy={groupedValueStrats[layerCfg.currentGroupingStrategy]}
					displayedFirms={displayedFirms}
				/>
				<LegendPaper
					bins={aggregatedLayer === undefined ? undefined : colorBins}
					colorsArray={[groupedValueStrats[layerCfg.currentGroupingStrategy].getColorDomain()]}
				/>
			</div>
		);
	}

	_getSectorColorValue = (filteredPoints) => {
		const {groupedValueStrats, layerCfg, displayedFirms, localFirms} = this.state;
		return Math.log(groupedValueStrats[layerCfg.currentGroupingStrategy].getColorValue(filteredPoints, layerCfg, localFirms, displayedFirms) + 1)
	};

	_getTilt = (current, overlaps) => {
		//const {temp_overlap_map} = this.state;
		if(temp_overlap_map.size === 0){
			temp_overlap_map = this._generateOverlapMap(overlaps);
		}
		let fromId = this._createTempId(current.from.position);
		let toId = this._createTempId(current.to.position);
		let hasFrom = temp_overlap_map.has(fromId);
		let oneEnd = hasFrom ? fromId : toId;
		let otherEnd = hasFrom ? toId : fromId;
		let intList = temp_overlap_map.get(hasFrom ? fromId : toId)[otherEnd];
		if(intList === undefined)
			intList = temp_overlap_map.get(otherEnd)[oneEnd];
		let signed_amount = current.aggregateData !== undefined ? current.aggregateData.signed_amount : current.signed_amount;
		let intSet = intList[signed_amount > 0 ? "in" : "out"];
		let portion = (90 - ANGLE_PADDING*2)/intSet.size;
		let angle = ((intSet.size === 1 ? 0 : intSet.get(overlaps.index)+1)*portion - ANGLE_PADDING);//*(current.aggregateData.signed_amount > 0 ? 1 : -1);
		return angle;
	}
	
	_sectorClicked(filteredPoints){
		const { layerCfg } = this.state;
		for(let t in layerCfg.clickedSectors){
			if(Math.floor(layerCfg.clickedSectors[t].x) === Math.floor(filteredPoints.x) &&
				Math.floor(layerCfg.clickedSectors[t].y) === Math.floor(filteredPoints.y))
					return 10;
			}
		return 0;
	}

	_getSectorizedPointsOutOfMetric = (dataOverride = false) => {
		const { displayedFirms, layerCfg, localFirms, groupedValueStrats } = this.state;
		let firms = dataOverride === false ? displayedFirms : dataOverride;
		if(layerCfg.currentGroupingStrategy === undefined)
			return [];
		let result = [];
		let max = Number.MIN_SAFE_INTEGER;
		firms.forEach((firmElement, firmIndex) => {
			let tmpResult = groupedValueStrats[layerCfg.currentGroupingStrategy].getColorValue([firmElement], layerCfg, localFirms, displayedFirms, DEFAULT_STRATEGY_OPTIONS);
			let sector = firmElement.edv_e1;																											
			if(result[sector] === undefined)
				result[sector] = tmpResult;
			else
				result[sector] += tmpResult;																										
			max = Math.max(max, result[sector]);
		});
		
		return {sectors: result, max: max};
	}

	_updateDisplayedFirms = () => {
		const {localFirms, layerCfg, groupedValueStrats} = this.state;
		let displayedFirms = Array.from(localFirms.values()).filter((firmElement, firmIndex) => {
			return groupedValueStrats[layerCfg.currentGroupingStrategy].filterFunction(firmElement, layerCfg, {...DEFAULT_STRATEGY_OPTIONS, 
										overrideLocalArcVisible: groupedValueStrats[layerCfg.currentGroupingStrategy].dependsOnTransactions,
										dateOverride: parseTimeline(layerCfg.currDate)
									})
		});
		//this.setState({...this.state, displayedFirms: displayedFirms, initFinished: true});
		return displayedFirms;
	}

	_getYearlyPointsOutOfMetric = (dataOverride = false) => {
		const { localFirms, timePoints, layerCfg, groupedValueStrats } = this.state;

		let firmsArray = dataOverride === false ? dataOverride : Array.from(localFirms.values());

		if(layerCfg.currentGroupingStrategy === undefined){			
			return [];
		}

		let yearlyDataPoints = timePoints.map((timePointElement, timePointIndex) => {
			let firms = firmsArray.filter((firmElement, firmIndex) => {
				return groupedValueStrats[layerCfg.currentGroupingStrategy].filterFunction(firmElement, layerCfg, {...DEFAULT_STRATEGY_OPTIONS,
																												  overrideLocalArcVisible: groupedValueStrats[layerCfg.currentGroupingStrategy].dependsOnTransactions,
																												  pushAttributes: false, 
																												  dateOverride: {year: timePointElement}
																												});
			});
			return groupedValueStrats[layerCfg.currentGroupingStrategy].getColorValue(firms, layerCfg, localFirms, firms, {...DEFAULT_STRATEGY_OPTIONS, 
																							 year: timePointElement,
																							 models: layerCfg.visible_models});
		});
		return yearlyDataPoints;
	}

	_generateOverlapMap = (overlaps) => {
		let temp_overlap_map = new Map();
		overlaps.data.forEach((overlap, index) => {
			let from = this._createTempId(overlap.from.position);
			let to = this._createTempId(overlap.to.position);

			if(!temp_overlap_map.has(from) && !temp_overlap_map.has(to)){
				let mapOut = new Map();
				let mapIn = new Map();
				let signed_amount = overlap.aggregateData !== undefined ? overlap.aggregateData.signed_amount : overlap.signed_amount;
				let selection = (signed_amount > 0 ? mapIn : mapOut);
				selection.set(index, 0);
				let inTo = [];
				inTo[to] = {"in": mapIn, "out": mapOut};
				temp_overlap_map.set(from, inTo);
			}else {
				let target = temp_overlap_map.get(temp_overlap_map.has(from) ? from : to);
				let otherEnd = temp_overlap_map.has(from) ? to : from;
				if(target[otherEnd] === undefined){
					target[otherEnd] = {"in": new Map(), "out": new Map()};
				}
				let signed_amount = overlap.aggregateData !== undefined ? overlap.aggregateData.signed_amount : overlap.signed_amount;
				let selection = (signed_amount > 0 ? target[otherEnd]["in"] : target[otherEnd]["out"]);
				selection.set(index, selection.size);
			}
		});
		//this.setState({...this.state, temp_overlap_map: temp_overlap_map});
		return temp_overlap_map;
	}

	/*_preloadOnHover = (info) => {
		let { localFirms } = this.state;
		if (info.object !== undefined) {
			let object = {
				...info.object,
				name: info.object.properties.name,
				points: info.object.firms.map((item) => { return localFirms.get(item) })
			};
			this._onHover({ ...info, object });
		} else
			this._onHover(info);
	}*/

	_getRandomColor = () => {
		let random = "#000000".replace(/0/g, function () { return (~~(Math.random() * 16)).toString(16); })
		return this._hexToRgbA(random);
	}

	_hexToRgbA = (hex) => {
		let c;
		if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
			c = hex.substring(1).split('');
			if (c.length === 3) {
				c = [c[0], c[0], c[1], c[1], c[2], c[2]];
			}
			c = '0x' + c.join('');
			return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
			//return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+',1)';
		}
		throw new Error('Bad Hex');
	}

	_sortObjectProps = (obj, callback, context) => {
		var tuples = [];

		for (var key in obj) tuples.push([key, obj[key]]);

		tuples.sort(function (a, b) {
			return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0
		});

		var length = tuples.length;
		while (length--) callback.call(context, tuples[length][0], tuples[length][1]);
	}

	_getCentroidForEdgeBundling = (d) => {
		const {layerCfg, locations_data} = this.state;
		const aggregation = layerCfg.aggregation
		if(aggregation < 0)
			return d.hexCentroid;
		else
			return locations_data[aggregation].centroids.get(d.regions[aggregation]);
	}

	_createTempId = (coords, reverse = false) => {
		if(reverse)
			return coords[1]+"_"+coords[0];
		return coords[0]+"_"+coords[1];
	}

	_reverseTempId = (tempId) => {
		let tempStrings = tempId.split("_");
		return [parseFloat(tempStrings[0]), parseFloat(tempStrings[1])];
	}

}

export function getFlowsFromEdges(points, active_models, year, localFirms, displayedFirms, aggregation, clickedSectors){ 
	let edges = [];
	var maxFlow = Number.MIN_SAFE_INTEGER;
	var minFlow = Number.MAX_SAFE_INTEGER;
	var totalFlowAbs = 0;
	var totalFlow = 0;
	var inFlow = 0;
	var outFlow = 0;
	var internalFlow = 0;

	var loadedEdges = new Set();

	//for(let model_idx of active_models){
	//	let model = models_data[model_idx].data[parseTimeline(layerCfg.currDate).year];

	let internalCentroidMap = [];

	for(var firm_proto in points){
		if (isNaN(firm_proto) || points[firm_proto].hexCentroid === undefined) 
			continue;
		let hex = aggregation < 0 ? points[firm_proto].hexCentroid[0]+"-"+points[firm_proto].hexCentroid[1] : points[firm_proto].regions[aggregation];
		internalCentroidMap[points[firm_proto].firm_id] = hex;
	}

	for (var firm_proto in points){
		let counter = 0;			
		if (!isNaN(firm_proto)) {
			var fromFirm = points[firm_proto];
			for(let model_idx in active_models){
				if(fromFirm.edges[model_idx] === undefined)
					continue;
				let currentFamily = active_models[model_idx];
				for(let model_id in currentFamily){		
					if(currentFamily[model_id] === undefined || !currentFamily[model_id].active)
						continue;
					let firmModelPresence = fromFirm.edges[model_idx][model_id];			
					if(firmModelPresence === undefined || firmModelPresence[year] === undefined)
						continue;
					else
						for(var toFirmIndex in firmModelPresence[year]) {
							
							if((localFirms !== undefined && !displayedFirms.includes(localFirms.get(parseInt(toFirmIndex))))){
								continue;
							}
							let amount = firmModelPresence[year][toFirmIndex];
							let fromFirmIndex = fromFirm.firm_id;

							if (amount === 0)
								continue;

							let absAmount = Math.abs(amount);					

							maxFlow = Math.max(maxFlow, absAmount);
							minFlow = Math.min(minFlow, absAmount);

							totalFlow += amount;
							totalFlowAbs += absAmount;

							let internal, fromPosition, toPosition, fromSector, toSector, fromName, toName;
							
							internal = 
								(internalCentroidMap[parseInt(toFirmIndex)] !== undefined && internalCentroidMap[parseInt(toFirmIndex)] === internalCentroidMap[fromFirmIndex])
								|| (clickedSectors[internalCentroidMap[parseInt(toFirmIndex)]] !== undefined && clickedSectors[internalCentroidMap[fromFirmIndex]] !== undefined);
							
							if(internal)
								internalFlow += absAmount;
							else
								if(amount < 0){
									/*if(localFirms !== undefined){
										fromPosition = extractPosition(fromFirm);
										toPosition = extractPosition(localFirms.get(parseInt(toFirmIndex)));									
									}*/
									outFlow += absAmount;
								}else{
									fromFirmIndex = toFirmIndex;
									toFirmIndex = fromFirm.firm_id;	
									/*if(localFirms !== undefined){
										fromPosition =  extractPosition(localFirms.get(parseInt(toFirmIndex)));									
										toPosition = extractPosition(fromFirm);
									}*/										
									inFlow += absAmount;
								}
							
							let edge_id = /*(counter++) + "_" +*/ fromFirmIndex + "_" + toFirmIndex + "-" + model_idx + "_" + model_id;					
							if(loadedEdges.has(edge_id))
								continue;
							else
								loadedEdges.add(edge_id);

							if(localFirms !== undefined){
								let internalFrom = localFirms.get(parseInt(fromFirmIndex)), internalTo = localFirms.get(parseInt(toFirmIndex));
								fromPosition = extractPosition(internalFrom);	
								toPosition = extractPosition(internalTo);	
								fromSector = internalFrom.edv_e1;
								toSector = internalTo.edv_e1;
								fromName = internalFrom.name;
								toName = internalTo.name
							
							const smt_cash_flow = {
								from: {
									firmId: fromFirmIndex,
									position: fromPosition, 
								},
								to: {
									firmId: toFirmIndex,
									position: toPosition,
								},
								internal: internal,
								fromId: parseInt(fromFirmIndex),
								toId: parseInt(toFirmIndex), 								
								amount: Math.abs(amount),
								fromSector: fromSector,
								toSector: toSector,
								fromName: fromName,
								toName: toName,
								signed_amount: amount,						
								model_idx: model_idx,
								model_id: model_id,
								model_name: currentFamily[model_id].name, 
								edgeId: edge_id
							};
							edges.push(smt_cash_flow);
						}
					}
				}
			}
		}
	}
	return {
		data: edges,
		maxFlow: maxFlow,
		minFlow: minFlow,
		totalFlow: totalFlow,
		totalFlowAbs: totalFlowAbs,
		inFlow: inFlow,
		outFlow: outFlow,
		internalFlow: internalFlow
	};
}

export default withStyles(MAP_VIS_STYLE)(MapVis);
