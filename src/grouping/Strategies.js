import React from 'react';
import { Typography } from "@material-ui/core";

import { getFlowsFromEdges, MAP_VIS_STYLE } from '../map-vis';
import { getSuffixString, parseTimeline, makeid } from '../panels/utils'

const HEATMAP_COLORS = [
	[255,255,217],
	[237,248,177],
	[199,233,180],
	[127,205,187],
	[65,182,196],
	[29,145,192],
	[34,94,168],
	[12,44,132]
];

const NEGATIVE_COLORS = [
	[247,244,249],
	[231,225,239],
	[212,185,218],
	[201,148,199],
	[223,101,176],
	[231,41,138],
	[206,18,86],
	[145,0,63]
];

const POSITIVE_COLORS = [
	[247,252,253],
	[229,245,249],
	[204,236,230],
	[153,216,201],
	[102,194,164],
	[65,174,118],
	[35,139,69],
	[0,88,36]
];

export const THRESHOLD = 0.04;

export const DEFAULT_STRATEGY_OPTIONS = {
	overrideLocalArcVisible: false,
	negateLocalArcVisible: false,
	pushAttributes: false,
	overrideSector: false,
	dateOverride: false
};

/* INTERPOLATION CODE TO INTEGRATE
			let idx_next = year_max - 2007;
			let idx_prev = idx_next - 1;
			let count_prev = hexagon.numFirmsYearlys[idx_prev];
			let count_next = hexagon.numFirmsYearlys[idx_next];
			let count_curr = Math.round(lerp(count_prev, count_next, s));
*/

var bilanzenFilter = (firm, options, extraCondition = (d) => true) => {
								let year = /*options.dateOverride === false ? pr_year :*/ options.dateOverride.year;
								return firm.bilanzen.get(year) !== undefined && firm.bilanzen.get(year) !== null && extraCondition(firm.bilanzen.get(year).cashFlow)
							};

/*var transactionFilter = (firm, layerCfg) => {
		let cond = false;
		for(let model of layerCfg.visible_models)
			cond = cond || (firm.edges[model] !== undefined && (firm.edges[model][firm.currDate.year] !== undefined));
		return cond;
};*/

var overallFirmFilter = (firm, layerCfg, options) => {
	let currDate = options.dateOverride !== false ? options.dateOverride : parseTimeline(layerCfg.currDate);
	if(options.overrideSector === undefined || options.overrideSector === false ? layerCfg.selectedSectors.has(firm.edv_e1) : options.overrideSector.has(firm.edv_e1)){	
		if((options.overrideLocalArcVisible || layerCfg.localArcVisible)){				
			let presence_test = false;
			for(let model in layerCfg.visible_models)
				for(let model_id in layerCfg.visible_models[model])
					if(layerCfg.visible_models[model][model_id].active)
						presence_test = presence_test || ((firm.edges[model] !== undefined && firm.edges[model][model_id] !== undefined) ? firm.edges[model][model_id][currDate.year] !== undefined : false);
			if(presence_test){
				if(options.pushAttributes){
					firm.currDate = currDate;
					firm.models = layerCfg.visible_models;
				}
				return true;
			}else
			if(options.pushAttributes){
				firm.currDate = undefined;
				firm.models = undefined;
			}		
				return false;
		}else{
			if(options.pushAttributes){
				firm.currDate = currDate;
				firm.models = layerCfg.visible_models;
			}			
			return true;
		}
	}else
		if(options.pushAttributes){
			firm.currDate = undefined;	
			firm.models = undefined;							
		}
		return false;
}

var firmMetricLabel = (info, firm, layerCfg, buckets, getVal) => {
	let totalValue = 0;
		info.points.forEach(function (firm) {
			totalValue += getVal(firm);
			if (buckets.get(firm.edv_e1) === undefined || buckets.get(firm.edv_e1) === null)
				buckets.set(firm.edv_e1, { name: firm.edv_e1, value: getVal(firm) });
			else {
				buckets.set(firm.edv_e1, { name: firm.edv_e1, value: buckets.get(firm.edv_e1).value + getVal(firm) });
			}
		});
	return totalValue;
}

var transactionMetricLabel = (info, localFirms, displayedFirms, layerCfg, buckets, aggrFunc, filterFunc) => {
	let incomingTotalValue = 0, outGoingTotalValue = 0;
	let year = parseTimeline(layerCfg.currDate).year;
	let visibleModels = layerCfg.visible_models;
	info.points.forEach(function (firm) {
		for(let modelname in visibleModels) 
			for (let model_idx in visibleModels[modelname]){
				if(!visibleModels[modelname][model_idx].active || firm.edges[modelname] === undefined || firm.edges[modelname][model_idx] === undefined)
					continue;
				let firmModel = firm.edges[modelname][model_idx];
				for(let toFirmIndex in firmModel[year]){
					let toFirm = localFirms.get(parseInt(toFirmIndex));
					if(!displayedFirms.includes(toFirm))
						continue;
					var amount = firmModel[year][toFirmIndex];				
					if(!filterFunc(amount))
						continue;
					let modelReadableName = visibleModels[modelname][model_idx].name;
					if(!buckets.has(modelReadableName))
						buckets.set(modelReadableName, new Map());
					let currentBucket = buckets.get(modelReadableName);
					let modifiedAmount = aggrFunc(amount);				
					if(amount > 0)
						incomingTotalValue += modifiedAmount;
					else
						outGoingTotalValue += modifiedAmount;
					if (currentBucket.get(firm.edv_e1) === undefined || currentBucket.get(firm.edv_e1) === null){
						currentBucket.set(firm.edv_e1, { name: firm.edv_e1, value: modifiedAmount });
					} else {
						currentBucket.set(firm.edv_e1, { name: firm.edv_e1, value: currentBucket.get(firm.edv_e1).value + modifiedAmount });
					}
				}
		}
	});
	return [incomingTotalValue, outGoingTotalValue];
}

var firmDensity = {
	name: "Firms Density",
	key: "firmsDensity",
	filterFunction: (firm, layerCfg, options = DEFAULT_STRATEGY_OPTIONS) => { 
		return overallFirmFilter(firm, layerCfg, options) && bilanzenFilter(firm, options);
	},
	getColorValue: (firms, layerCfg, localFirms, displayedFirms, options = DEFAULT_STRATEGY_OPTIONS) => 
		{
			return firms.length;
			//return firms.reduce((value, firm) => {firm.contribution_value = 1; return value + 1;})
		},
	getLabel: (info, localFirms, layerCfg, displayedFirms) => {
		let buckets = new Map();
		let totalValue = firmMetricLabel(info, localFirms, layerCfg, buckets, (firm) => 1 );
		let sector_text = computeLabelFromBuckets(buckets, totalValue);
		let value_label = getSuffixString(totalValue);
		let prefix = info.name === undefined ? "" : info.name + "\n";
		return prefix + "Firms: " + value_label[0] + value_label[1] + "\n" + sector_text;
	},
	getHeader: 'Contribution',
	getColorDomain: () => [...HEATMAP_COLORS],
	dependsOnTransactions: false,
};

var firmCashInFlow = {
	name: "Gaining Firms Cashflow",
	key: "firmsCashInFlow",
	filterFunction: (firm, layerCfg, options = DEFAULT_STRATEGY_OPTIONS) => { 
		return overallFirmFilter(firm, layerCfg, options) && bilanzenFilter(firm, options, (d) => d > 0);
	},
	getColorValue: (firms, layerCfg, localFirms, displayedFirms, options = DEFAULT_STRATEGY_OPTIONS) => {
		let year = options.year === undefined ? parseTimeline(layerCfg.currDate).year : options.year;
		return firms.reduce((value, firm) => {
			let bilanzen = firm.bilanzen.get(year);
			if(bilanzen === undefined)
				return 0;
			/*firm.contribution_value = Math.abs(bilanzen.cashFlow);
			return firm.contribution_value;
			//return value + Math.abs(bilanzen.cashFlow > 0 ? bilanzen.cashFlow : 0)}, 0);*/
			return Math.abs(bilanzen.cashFlow) + value;
		}, 0);
	},
	getLabel: (info, localFirms, layerCfg, displayedFirms) => {
		let buckets = new Map();
		let year = parseTimeline(layerCfg.currDate).year;
		let totalValue = firmMetricLabel(info, localFirms, layerCfg, buckets, (firm) => 
										Math.abs(firm.bilanzen.get(year).cashFlow > 0 ? firm.bilanzen.get(year).cashFlow: 0) );
		let sector_text = computeLabelFromBuckets(buckets, totalValue);
		let value_label = getSuffixString(totalValue);
		let prefix = info.name === undefined ? "" : info.name + "\n";
		return prefix + "Cash Inflow: " + value_label[0] + value_label[1] + "\n" + sector_text;
	},
	getHeader: 'Cash Inflow',
	getColorDomain: () => [...POSITIVE_COLORS],
	dependsOnTransactions: false,
};

var firmCashOutFlow = {
	name: "Losing Firms Cashflow",
	key: "firmsCashOutFlow",
	filterFunction: (firm, layerCfg, options = DEFAULT_STRATEGY_OPTIONS) => { 
		return overallFirmFilter(firm, layerCfg, options) && bilanzenFilter(firm, options, (d) => d < 0);
	},
	getColorValue: (firms, layerCfg, localFirms, displayedFirms, options = DEFAULT_STRATEGY_OPTIONS) => {
		let year = options.year === undefined ? parseTimeline(layerCfg.currDate).year : options.year;
		return firms.reduce((value, firm) => {
			let bilanzen = firm.bilanzen.get(year);
			if(bilanzen === undefined)
				return 0;
			//firm.contribution_value = Math.abs(bilanzen.cashFlow);
			//return firm.contribution_value;
			//return value + Math.abs(bilanzen.cashFlow > 0 ? bilanzen.cashFlow : 0)}, 0);	},
			return Math.abs(bilanzen.cashFlow) + value;
		}, 0);
	},
	getLabel: (info, localFirms, layerCfg, displayedFirms) => {
		let buckets = new Map();
		let year = parseTimeline(layerCfg.currDate).year;
		let totalValue = firmMetricLabel(info, localFirms, layerCfg, buckets, (firm) => 
																					Math.abs(firm.bilanzen.get(year).cashFlow < 0 ? firm.bilanzen.get(year).cashFlow : 0) );
		let sector_text = computeLabelFromBuckets(buckets, totalValue);
		let value_label = getSuffixString(totalValue);	
		let prefix = info.name === undefined ? "" : info.name + "\n";
		return prefix + "Cash Outflow: " + value_label[0] + value_label[1] + "\n" + sector_text;
	},
	getHeader: 'Cash Outflow',
	getColorDomain: () => [...NEGATIVE_COLORS],
	dependsOnTransactions: false,
};

var transactionDensity = {
	name: "Transaction Density",
	key: "trans_density",
	filterFunction: (firm, layerCfg, options = DEFAULT_STRATEGY_OPTIONS) => { 
		return overallFirmFilter(firm, layerCfg, {...options, overrideLocalArcVisible: true}) 
			&& bilanzenFilter(firm, options);
	},
	getColorValue: (firms, layerCfg, localFirms, displayedFirms, options = DEFAULT_STRATEGY_OPTIONS) => {
		let edges; 
		if(options.models !== undefined && options.year !== undefined)
			edges = getFlowsFromEdges(firms, options.models, options.year, localFirms, displayedFirms, layerCfg.aggregation, layerCfg.clickedSectors); 
		else		
			edges = getFlowsFromEdges(firms, layerCfg.visible_models, parseTimeline(layerCfg.currDate).year, localFirms, displayedFirms, layerCfg.aggregation, layerCfg.clickedSectors); 
		return edges.data.length;
	},
	getLabel: (info, localFirms, layerCfg, displayedFirms) => {
		var buckets = new Map();
		let totalValue = transactionMetricLabel(info, localFirms, displayedFirms, layerCfg, buckets, (d) => 1, (d) => true);
		let sector_text = computeLabelFromTransactionBuckets(buckets, totalValue[0] + totalValue[1]);
		let value_labelIn = getSuffixString(totalValue[0]);
		let value_labelOut = getSuffixString(totalValue[1]);
		return ((
				<div>
				<Typography style={MAP_VIS_STYLE.labelText}>{info.name === undefined ? "" : info.name + "<br/>"}
			    Transactions Incoming: {value_labelIn[0] + value_labelIn[1]}<br/>
				Transactions Outgoing: {value_labelOut[0] + value_labelOut[1]}</Typography>
				{sector_text}
				</div>
				));
	},
	getHeader: '# of Transactions',
	getColorDomain: () => [...HEATMAP_COLORS],
	dependsOnTransactions: true,
};

var transactionInflow = {
	name: "Transactions Inflow",
	key: "trans_inflow",
	filterFunction: (firm, layerCfg, options = DEFAULT_STRATEGY_OPTIONS) => { 
		return overallFirmFilter(firm, layerCfg, {...options, overrideLocalArcVisible: true}) 
			&& bilanzenFilter(firm, options, (d) => d > 0);
	},
	getColorValue: (firms, layerCfg, localFirms, displayedFirms, options = DEFAULT_STRATEGY_OPTIONS) => {
		let edges; 
		if(options.models !== undefined && options.year !== undefined)
			edges = getFlowsFromEdges(firms, options.models, options.year, localFirms, displayedFirms, layerCfg.aggregation, layerCfg.clickedSectors); 
		else		
			edges = getFlowsFromEdges(firms, layerCfg.visible_models, parseTimeline(layerCfg.currDate).year, localFirms, displayedFirms, layerCfg.aggregation, layerCfg.clickedSectors); 
		return edges.inFlow;
	},
	getLabel: (info, localFirms, layerCfg, displayedFirms) => {
		var buckets = new Map();
		let totalValue = transactionMetricLabel(info, localFirms, displayedFirms, layerCfg, buckets, (d) => d, (d) => d > 0);
		let sector_text = computeLabelFromTransactionBuckets(buckets, totalValue[0] + totalValue[1]);
		let value_labelIn = getSuffixString(totalValue[0]);
		//let value_labelOut = getSuffixString(totalValue[1]);
		return ((
			<div>
			<Typography style={MAP_VIS_STYLE.labelText}>{info.name === undefined ? "" : info.name + "<br/>"}
			Transactions Inflow: {value_labelIn[0] + value_labelIn[1]}<br/>
			{sector_text}</Typography>
			</div>
			));
	},
	getHeader: 'Transactions Inflow',
	getColorDomain: () => [...POSITIVE_COLORS],
	dependsOnTransactions: true,
};

var transactionOutflow = {
	name: "Transactions Outflow",
	key: "trans_outflow",
	filterFunction: (firm, layerCfg, options = DEFAULT_STRATEGY_OPTIONS) => { 
		return overallFirmFilter(firm, layerCfg, {...options, overrideLocalArcVisible: true}) 
			&& bilanzenFilter(firm, options);
	},
	getColorValue: (firms, layerCfg, localFirms, displayedFirms, options = DEFAULT_STRATEGY_OPTIONS) => {
		let edges; 
		if(options.models !== undefined && options.year !== undefined)
			edges = getFlowsFromEdges(firms, options.models, options.year, localFirms, displayedFirms, layerCfg.aggregation, layerCfg.clickedSectors); 
		else		
			edges = getFlowsFromEdges(firms, layerCfg.visible_models, parseTimeline(layerCfg.currDate).year, localFirms, displayedFirms, layerCfg.aggregation, layerCfg.clickedSectors); 
		return edges.outFlow;
	},
	getLabel: (info, localFirms, layerCfg, displayedFirms) => {
		var buckets = new Map();
		let totalValue = transactionMetricLabel(info, localFirms, displayedFirms, layerCfg, buckets, (d) => Math.abs(d), (d) => d < 0);
		let sector_text = computeLabelFromTransactionBuckets(buckets, totalValue[0] + totalValue[1]);
		//let value_labelIn = getSuffixString(totalValue[0]);
		let value_labelOut = getSuffixString(totalValue[1]);
		return ((
			<div>
			<Typography style={MAP_VIS_STYLE.labelText}>{info.name === undefined ? "" : info.name + "<br/>"}
			Transactions Outflow: {value_labelOut[0] + value_labelOut[1]}</Typography>
			{sector_text}
			</div>
			));
	},
	getHeader: 'Transactions Outflow',		
	getColorDomain: () => [...NEGATIVE_COLORS],
	dependsOnTransactions: true,
};

const strategies = [
	firmDensity,
	firmCashInFlow,
	firmCashOutFlow,
	transactionDensity,
	transactionInflow,
	transactionOutflow
];

function computeLabelFromTransactionBuckets(transBuckets, totalValue){
	let result = [];
	transBuckets.forEach((singleBucket, name) => {
		let relativeValue = Array.from(singleBucket.values()).reduce((total, current) => { return total + current.value; }, 0);
		let relativeValueString = getSuffixString(relativeValue);
		result.push((
					<td key={makeid(4)}>
						<Typography style={MAP_VIS_STYLE.labelText}>{name} : {relativeValueString[0]+relativeValueString[1]}<br/>
						{computeLabelFromBuckets(singleBucket, relativeValue)}</Typography>
					</td>
					));
	});
	return (<table>
				<tbody>
					<tr key={makeid(6)}>
						{result}
					</tr>
				</tbody>
			</table>);
}

function computeLabelFromBuckets(buckets, totalValue){
	let sector_text = "";
	let othersValue = 0;
	sortBucket(buckets).forEach((key) => {
		let value = buckets.get(key);
		let relativeValue = value.value / totalValue;
		if(relativeValue < THRESHOLD)
			othersValue += relativeValue;
		else
			sector_text += value.name + ": " + Math.round(relativeValue * 100) + "%\n";
	});
	if(othersValue >= 0.01)
		sector_text += "Others:" + Math.round(othersValue * 100) + "%\n";
	return sector_text;
}

function sortBucket(buckets){
	let tempKeyArray = Array.from(buckets.keys());
		tempKeyArray.sort((d, t) => {
			if(buckets.get(d).value < buckets.get(t).value)
				return 1;
			else if(buckets.get(d).value > buckets.get(t).value)
				return -1;
			else
				return 0;
		});
	return tempKeyArray;
}

export function getSelectedGroupingStrategies() {
	var strats = [];
	strategies.forEach((item, index) => {
		strats[index] = item;
	});

	return strats;
}

