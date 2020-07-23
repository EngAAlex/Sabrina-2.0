import React from "react";
import 'rc-tooltip/assets/bootstrap.css';

import {ExpansionPanel, ExpansionPanelSummary ,ExpansionPanelDetails, 
		Tooltip, Select, MenuItem, FormControl, Fab, Paper, Collapse, Switch,
		FormControlLabel, Typography, Button, Grid, Slider} from '@material-ui/core';
import {withStyles} from "@material-ui/core/styles";
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Settings from '@material-ui/icons/Settings';
import SettingsOutline from '@material-ui/icons/SettingsOutlined';

import Chroma from "chroma-js";

//import { Settings, SettingsOutline } from 'mdi-material-ui';
import { getSuffixString, parseTimeline, COMMON_SWITCH_STYLES } from "./panels/utils";

const MAPBOX_DEFAULT_MAPSTYLES = [
	/*{
		label: 'Streets V10',
		value: 'mapbox://styles/mapbox/streets-v10'
	},
	{
		label: 'Outdoors V10',
		value: 'mapbox://styles/mapbox/outdoors-v10'
	},*/
	{
		label: 'Light V9',
		value: 'mapbox://styles/mapbox/light-v9'
	},
	{
		label: 'Dark V9',
		value: 'mapbox://styles/mapbox/dark-v9'
	},
	/*{
		label: 'Satellite V9',
		value: 'mapbox://styles/mapbox/satellite-v9'
	},
	{
		label: 'Satellite Streets V10',
		value: 'mapbox://styles/mapbox/satellite-streets-v10'
	},
	{
		label: 'Navigation Preview Day V4',
		value: 'mapbox://styles/mapbox/navigation-preview-day-v4'
	},
	{
		label: 'Navitation Preview Night  V4',
		value: 'mapbox://styles/mapbox/navigation-preview-night-v4'
	},
	{
		label: 'Navigation Guidance Day V4',
		value: 'mapbox://styles/mapbox/navigation-guidance-day-v4'
	},
	{
		label: 'Navigation Guidance Night V4',
		value: 'mapbox://styles/mapbox/navigation-guidance-night-v4'
	}*/
	];

//const LOCAL_ARC_WIDTH_RANGE = [12,12];

/*function linearMapping(domain, range, s) {
	return (range[1] - range[0]) * (s - domain[0]) / (domain[1] - domain[0]) + range[0];
}*/

function lerp(a, b, t) {
	return a * (1 - t) + b * t;
};

function clamp(c, a, b) {
	return (c < a) ? a : ((c > b) ? b : c);
};

const CT_CFG_STYLES = {
		root: {
			textAlign: 'left',
			display: 'block',
			opacity: "0.95",
			position: "absolute",
			top: "50px",
			zIndex: 8,
		},
		button: {
			color: '#607d8b',
			opacity: '0.75',
			zIndex: 9,
		},
		cfgPanel: {
			textAlign: 'left',
			display: 'flex',
			flexWrap: 'wrap',
			backgroundColor: "#f5f5f5",
			opacity: "0.95",
			width: "220px",
			padding: "5px 5px",
			marginTop: '5px',
			overflowY: 'auto',
			overflowX: 'hidden',
		},
		formControl: {
			padding: "5px 5px",
			width: 220,
		},
		sliderThumb: {
			backgroundColor: "#2196f3"
		},
		slider: {
			padding: "15px 0px",
		},
		sliderContainer: {
			padding: "5px 5px",
			width: '100%'
		},
		label: {
			fontSize: "14px",
			color: "#607d8b",
			fontWeight: "bold"		
		},
		sectorInfo: {
			fontSize: "15px",
		},
		textContent: {
			fontSize: "15px",
			color: "#2196f3"
		},
		sectorPanel: {
			padding: "5px 5px",
		},
		sectorPanelSummary: {
			padding: "0px",
			margin: "0px 0px 10px 0px",
		},
		sectorPanelIcon: {
			padding: "0px 0px 0px 0px",
			marginRight: "0px"
		},
		sectorDetailPanel: {
			padding: "0px 5px 5px 0px",
			margin: "0px 0px 0px 0px",
			flexGrow: 1,
		},
		sectorHeading: {
			fontSize: "13px",
			color: "#607d8b",
			flexBasis: '30%',
			flexShrink: 0,
		},
		sectorOptions: {
			fontSize: "13px",
			fontFamily: "Monospace",
		},
		sectorSecondHeading: {
			fontSize: "13px",
			fontFamily: "Monospace",
			color: "#2196f3",
			flexBasis: '55%',
			flexShrink: 0,
		},
		sectorButtonUp: {
			fontFamily: "Monospace",
			padding: "0px 0px 0px 0px",
			margin:"0px 0px 5px 0px",
			backgroundColor: "#9e9f9f",
			color: "#ffffff"
		},
		sectorButtonDown: {
			fontFamily: "Monospace",
			padding: "0px 0px 0px 0px",
			margin:"0px 0px 5px 0px",
			backgroundColor: "#4fc3f7",
			color: "#212121"
		},
		span: {
			fontSize: "16px",
			color: "#607d8b",
			fontWeight: "bold"
		},
};

const LL_EXP_PANEL_STYLES = {
		heading_withmargin: {
			margin:"15px 0px 0px 0px",
		},
		root: {
			textAlign: 'left',
			display: 'block',
			opacity: "0.85",
			position: "absolute",
			top: "50px",
			right: "10px",
			zIndex: 8
		},
		text: {
			fontSize: "15px",
			color: "#2196f3",
			fontFamily: "Monospace",
		}
}

export function floatToDate(value) {
	let currDate = new Date('2000-01-01');
	let year = Math.floor(value);
	currDate.setFullYear(year);
	currDate.setDate(1 + Math.round(365 * (value - year)));
	return currDate;
}

class LayersListPanel extends React.Component{

	render() {

		const { classes, layers } = this.props;

		return (
				<div className={classes.root}>
				<ExpansionPanel>
				<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
				<Typography className={classes.heading}>Active Layers</Typography>
				</ExpansionPanelSummary>
				<ExpansionPanelDetails>
				<div className={classes.text}>
				{layers.map((curr) => {
					return curr.id+" ";
				})
				}								
				</div>				
				</ExpansionPanelDetails>
				</ExpansionPanel>
				</div> );

	};

}

class CtLayerCfgComp extends React.Component {
	state = {
			panelIn: false,
			sectorPanelExpanded: true,
			modelOptions: ""
	};

	_onToggleSectorPanel = () => {
		this.setState(state => ({
			sectorPanelExpanded: !state.sectorPanelExpanded
		}));
	}

	_onTogglePanel = () => {
		this.setState(state => ({ panelIn: !state.panelIn }));
	};

	_onHexagonRadiusChange = (event, curr_value) => {
		const { layerCfg } = this.props;
		if (layerCfg.hexagonRadius !== curr_value) {
			const currLayerCfg = {
					...this.props.layerCfg,
					hexagonRadius: curr_value
			};
			this.props.onLayerCfgChange(currLayerCfg, {clearClick: true});
		}
	};

	_onOpacityValueChange = (event, curr_value) => {
		const { layerCfg } = this.props;
		if (layerCfg.aggregationLayerOpacity !== curr_value) {
			const currLayerCfg = {
					...this.props.layerCfg,
					aggregationLayerOpacity: curr_value
			};
			this.props.onLayerCfgChange(currLayerCfg, {});
		}
	};

	_onAggregationLevelChange = event => {
		const currLayerCfg = {
				...this.props.layerCfg,
				aggregation: Number.parseInt(event.target.value),
				clickedSectors: []
		};
		this.props.onLayerCfgChange(currLayerCfg, {clearClick: true});
	};


	_onToggleLocalArc = event => {
		const currLayerCfg = {
				...this.props.layerCfg,
				localArcVisible: event.target.checked
		};
		this.props.onLayerCfgChange(currLayerCfg, {updateDisplayedFirms: true, updateColorValues: true, clearClick: true});
	};

	_onChangeEdgeBundling = event => {
		const currLayerCfg = {
				...this.props.layerCfg,
				bundleEdges: event.target.checked
		};
		this.props.onLayerCfgChange(currLayerCfg, {invalidateOverlapMap: true});
	};

	_onGroupingStrategyChange = event => {
		const { layerCfg } = this.props;
		if (layerCfg["currentGroupingStrategy"] !== event.target.value) {
			const currLayerCfg = {
					...this.props.layerCfg,
					currentGroupingStrategy: event.target.value
			};
			this.props.onLayerCfgChange(currLayerCfg, {updateDisplayedFirms: true, updateColorValues: true});
		}
	}

	_onSectorButtonClick = (sector) => {
		const { layerCfg, oenaceLevelOne, onLayerCfgChange } = this.props;
		let selectedSectors = new Set(layerCfg.selectedSectors);
		if (sector === 'all') {
			if (selectedSectors.size === Object.keys(oenaceLevelOne).length) {
				selectedSectors.clear();
			} else {
				selectedSectors = new Set(Object.keys(oenaceLevelOne));
			}
		} else if (selectedSectors.has(sector)) {
			selectedSectors.delete(sector)
		} else {
			selectedSectors.add(sector)
		}
		const currLayerCfg = {
				...layerCfg,
				selectedSectors: selectedSectors
		};
		onLayerCfgChange(currLayerCfg, {updateDisplayedFirms: true, clearClickIfProximity: true});
	}

	render() {
		const { panelIn, sectorPanelExpanded } = this.state;
		const { classes, locations, groupingStrategies, sectorizedDataPoints, layerCfg, 
			mapStyle, oenaceLevelOne, disabledTransactionFilter, colorsArray} = this.props;
		let modArr = colorsArray.map((curr) => {return [curr[0], curr[1], curr[2]]});
		const hexRadius = layerCfg.hexagonRadius;
		const settingsButton = panelIn ? <SettingsOutline/> : <Settings/>;
		let hexagonSlider, regionLevelSelector, sectorPanel, timelineSwitch, timelineOptionSelector, currDate,
		sectorButtons, aggregationSelector, localArcSwitch, edgeBundleSwitch, opacitySlider;
		let selectedSectors = Object.keys(oenaceLevelOne).map(
				(curr, idx) => {
					let label = layerCfg.selectedSectors.has(curr) ? <span>{curr}</span> : <span>&nbsp;</span>;
					let sectorText = idx % 7 === 6 ? label : <span>{label} </span>;
					return idx % 7 === 6 ? <span key={idx}>{sectorText}<br /></span> : <span key={idx}>{sectorText}</span>;
				}
		);
		if(oenaceLevelOne !== undefined && sectorizedDataPoints.sectors !== undefined){
			let sectorButtonColorScale;
			if(layerCfg.selectedSectors.size > 0) 
				sectorButtonColorScale = Chroma.scale(modArr).domain(Chroma.limits([1, Math.abs(sectorizedDataPoints.max + 1)], 'l', modArr.length));							
				//sectorButtonColorScale = Chroma.scale(['white', '4fc3f7']).domain(Chroma.limits([1, Math.abs(sectorizedDataPoints.max + 1)], 'l', layerCfg.selectedSectors.size));							
			sectorButtons = Object.keys(oenaceLevelOne).map(
					curr => {
						let sectorValue = sectorizedDataPoints.sectors[curr] === undefined || sectorizedDataPoints.sectors[curr] === 0 ? 1 : sectorizedDataPoints.sectors[curr];
						var valueSuffixArray = getSuffixString(sectorValue);
						var tooltipTitle = oenaceLevelOne[curr] === undefined ? "" : oenaceLevelOne[curr]  + " -- value " + valueSuffixArray[0]+valueSuffixArray[1];
						return (
								<Grid item xs={4}  key={curr}>
								<Tooltip title={tooltipTitle} classes={{ tooltip: classes.sectorInfo }}>
								<Button
									className={layerCfg.selectedSectors.has(curr)? classes.sectorButtonDown: classes.sectorButtonUp}
									style={{backgroundColor: sectorButtonColorScale !== undefined && layerCfg.selectedSectors.has(curr) ? sectorButtonColorScale(sectorValue).alpha(0.75).hex() : classes.sectorButtonUp.backgroundColor}}									
									size="small"
									onClick={() => this._onSectorButtonClick(curr)}
									>
									{curr}
								</Button>
								</Tooltip>
								</Grid>
						)});
		}		
		if(locations !== undefined)
			aggregationSelector = (
					<FormControl className={classes.formControl}>
					<Typography htmlFor="aggregation-level-option" className={classes.label}>Aggregation</Typography>
					<Select
					value={layerCfg.aggregation}
					onChange={this._onAggregationLevelChange}
					inputProps={{
						name: 'aggregation-level-option',
						id: 'aggregation-level-option',}}
					>
					<MenuItem value='-1' key='Proximity'>
					<Typography className={classes.textContent}>Hexagons</Typography>
					</MenuItem>
					{locations.map((item, index) =>					
					<MenuItem key={index} value={index}>
					<Typography className={classes.textContent}>{item.location_name}</Typography>
					</MenuItem>
					)}
					</Select>
					</FormControl>
			);

		localArcSwitch = (
				<FormControlLabel
				className={classes.timelineSwitch}
				control={
						<Switch
						checked={layerCfg.localArcVisible}
						onChange={this._onToggleLocalArc}
						disabled={disabledTransactionFilter}
						value="localArcVisible"
							classes={{
								switchBase: classes.timelineSwitchBase,
								checked: classes.timelineChecked,
								track: classes.timelineBar,
							}}
						/>
				}
				label={<Typography htmlFor="localArcVisible" className={classes.label}>Firms in Models Only</Typography>}
				labelPlacement="start"
					/>
		);

		edgeBundleSwitch = (
			<FormControlLabel
			className={classes.timelineSwitch}
			control={
					<Switch
					checked={layerCfg.bundleEdges}
					onChange={this._onChangeEdgeBundling}
						classes={{
								switchBase: classes.timelineSwitchBase,
								checked: classes.timelineChecked,
								track: classes.timelineBar,
							}}
					/>
			}
			label={<Typography htmlFor="localArcVisible" className={classes.label}>Bundle Edges</Typography>}
			labelPlacement="start"
				/>
	);

		currDate = (
				<div className={classes.sliderContainer}>
				<Typography htmlFor="currDate" className={classes.label}>
				Current date: <span className={classes.textContent}>
				{floatToDate(layerCfg.currDate).toISOString().substring(0, 10)}
				</span>
				</Typography>
				</div>
		);

		if(groupingStrategies !== undefined){
			timelineOptionSelector = (
					<FormControl className={classes.formControl}>
					<Typography htmlFor="groupingStrategy" className={classes.label}>Choose Metric</Typography>
					<Select
					value={layerCfg.currentGroupingStrategy}
					onChange={this._onGroupingStrategyChange}
					inputProps={{
						name: 'groupingStrategy',
						id: 'groupingStrategy',
					}}
					>
					{groupingStrategies.map((d, index) => (
							<MenuItem value={index} key={index}>
							<Typography className={classes.textContent}>{d.name}</Typography>
							</MenuItem>	
					))}
					</Select>
					</FormControl>
			);
		}
	
		hexagonSlider = layerCfg.aggregation >= 0 ? ""
				: (
				<div className={classes.sliderContainer}>
				<Typography id="hexagon-radius-icon" className={classes.label}>
				Hexagon radius: <span className={classes.textContent}>{hexRadius}</span> meters
				</Typography>
				<Slider
				value={hexRadius}
				min={25}
				max={6000}
				step={25}
				aria-labelledby="hexagon-radius-icon"
					onChange={this._onHexagonRadiusChange}
				classes={{
					root: classes.slider,
					thumb: classes.sliderThumb,
					track: classes.sliderThumb,
				}}
				/>
				</div>				
		);

		opacitySlider = (
			<div className={classes.sliderContainer}>
			<Typography id="opacity-slider-icon" className={classes.label}>
			Layer Opacity: <span className={classes.textContent}>{layerCfg.aggregationLayerOpacity}</span>
			</Typography>
			<Slider
			value={layerCfg.aggregationLayerOpacity}
			min={0}
			max={1}
			step={0.02}
			aria-labelledby="hexagon-radius-icon"
				onChange={this._onOpacityValueChange}
			classes={{
				root: classes.slider,
				thumb: classes.sliderThumb,
				track: classes.sliderThumb,
			}}
			/>
			</div>				
		);

		let isButtonDown = layerCfg.selectedSectors.size === Object.keys(oenaceLevelOne).length;
		sectorPanel = (
				<ExpansionPanel className={classes.sectorPanel} expanded={sectorPanelExpanded} onChange={this._onToggleSectorPanel}>
					<ExpansionPanelSummary
					className={classes.sectorPanelSummary}
					classes={{
						expandIcon: classes.sectorPanelIcon,
					}}
					expandIcon={<ExpandMoreIcon />}>
					<Typography className={classes.sectorHeading}>Selected sectors: </Typography>
					<Typography className={classes.sectorSecondHeading}>{selectedSectors}</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails className={classes.sectorDetailPanel}>
						<Grid container>
							<Grid container spacing={0} justify="center" alignItems='flex-start' >
								<Grid item xs={4}>
									<Button
									className={isButtonDown? classes.sectorButtonDown: classes.sectorButtonUp}
									size="large"
										onClick={() => this._onSectorButtonClick('all')}
									>
									all
									</Button>
								</Grid>
							</Grid>
							<Grid container spacing={0}>
							{sectorButtons}
							</Grid>
						</Grid>
					</ExpansionPanelDetails>
				</ExpansionPanel>
		);

		return (
				<div className={classes.root}>
				<Fab size='small' className={classes.button} onClick={this._onTogglePanel} aria-label="Collapse">
					{settingsButton}
				</Fab>
				<Collapse in={panelIn}>
					<Paper className={classes.cfgPanel}>
						<FormControl className={classes.formControl}>
							<Typography htmlFor="mapbox-map-style" className={classes.label}>Map style</Typography>
							<Select
							value={mapStyle}
							onChange={this.props.onMapStyleChange}
							inputProps={{
								name: 'mapbox-map-style',
								id: 'mapbox-map-style',}}
							>
							{MAPBOX_DEFAULT_MAPSTYLES.map(style => (
									<MenuItem value={style.value} key={style.value}>
									<Typography className={classes.textContent}>{style.label}</Typography>
									</MenuItem>
							))}
							</Select>
						</FormControl>
						{aggregationSelector}
						{hexagonSlider}
						{opacitySlider}
						{localArcSwitch}
						{edgeBundleSwitch}
						{timelineSwitch}
						{timelineOptionSelector}
						{currDate}
						{regionLevelSelector}
						{sectorPanel}
					</Paper>
				</Collapse>
				</div>
		);
	}
}

export function getElementColorValue (hexagon, currDate, option, timePoints) {

	//let {currDate, option, timePoints} = this.props;	

	/*if (!layerCfg.timelineEnabled) {
		return Math.log(hexagon.points.length + 1);
	}
	 */
	let year_min = timePoints[0]; 
	let year_max = timePoints[timePoints.length - 1];
	let {year, s} = parseTimeline(currDate);
	let curr_year = clamp(year, year_min, year_max);
	let clamped_index = curr_year - year_min;
	let idx_next = year - year_min;
	let idx_prev = idx_next - 1;
	if (option === 'firmDensity') {
		if (year > year_min && year <= year_max && s !== 0) {
			let count_prev = hexagon.numFirmsYearlys[idx_prev];
			let count_next = hexagon.numFirmsYearlys[idx_next];
			let count_curr = Math.round(lerp(count_prev, count_next, s));
			return Math.log(count_curr + 1);
		} else {				
			return Math.log(hexagon.numFirmsYearlys[clamped_index] + 1);
		}
	} else if (option === 'firmDensityGrad') {
		if(clamped_index > 0)
			return hexagon.gradNumFirmsYearlys[clamped_index] - hexagon.gradNumFirmsYearlys[clamped_index - 1];
		return hexagon.gradNumFirmsYearlys[clamped_index];
	} else if (option === 'cashFlow') {
		if (year > year_min && year <= year_max && s !== 0) {
			let cash_flow_prev = hexagon.euRatiosYearlys[idx_prev].cashFlow;
			let cash_flow_next = hexagon.euRatiosYearlys[idx_next].cashFlow;
			let cash_flow_curr = Math.round(lerp(cash_flow_prev, cash_flow_next, s));
			return cash_flow_curr + 1;
		} else {				
			return hexagon.euRatiosYearlys[clamped_index].cashFlow + 1;
		}
	} else if (option === 'cashFlowGrad') {
		if(clamped_index > 0)
			return hexagon.gradEuRatiosYearlys[clamped_index].cashFlow - hexagon.gradEuRatiosYearlys[clamped_index - 1].cashFlow;
		return hexagon.gradEuRatiosYearlys[clamped_index].cashFlow;
	} else {
		return hexagon.points.length;
	}
};

const CtLayerCfg = withStyles(Object.assign(COMMON_SWITCH_STYLES, CT_CFG_STYLES))(CtLayerCfgComp);
const LayersList = withStyles(LL_EXP_PANEL_STYLES)(LayersListPanel);
export {CtLayerCfg, LayersList};
