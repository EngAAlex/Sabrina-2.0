import {GeoJsonLayer} from '@deck.gl/layers';
import BinSorter from '../bin-sorter';
import chroma from 'chroma-js';


class LocalGeoJsonLayer extends GeoJsonLayer {

	initializeState(){
		super.initializeState({colorBins: []});		
		//this.getFillColor = (cell) => {return this.getCellColor(cell)};
		//this.state.layer.props.getFillColor = {type: 'accessor', value: (cell) => {return this.getCellColor(cell);}};
	}
	
	updateState({oldProps, props, context, changeFlags}) {
		super.updateState({oldProps, props, context, changeFlags});
		const {displayedFirms} = props;
		//const {firmsDisplayed, timePoints} = props;
		//const dimensionChanges = this.getDimensionChanges(oldProps, props);		
		if ((changeFlags.updateTriggersChanged && changeFlags.updateTriggersChanged.getFillColor) || changeFlags.dataChanged){
			props.data.features.forEach((item, index) => {
				item.points = item.original_points.filter((object) => displayedFirms.includes(object));
			});
			//this.getColorScale();
			this.getSortedColorBins();			
		} /*else if (dimensionChanges) {
			dimensionChanges.forEach(f => typeof f === 'function' && f.apply(this));
		}*/
	}
	
	/*getDimensionUpdaters() {
		let superDimUpdaters = super.getDimensionUpdaters();
		let dimUpdaters = {...superDimUpdaters};
		//dimUpdaters.getColor[2].triggers.push('timelineEnabled');
		dimUpdaters.getColor[2].triggers.push('timelineOption');

		return dimUpdaters;
	}*/

	getColorScale() {
		const { sortedColorBins, colorValueDomain } = this.state
		const {colorPalette, clickedSectors} = this.props;
		const {getCellColor, quantizeScale} = this;
		//const colorDomain = this.props.colorDomain || this.state.colorValueDomain;

		let currentBins = [];

		let colorScaleFunc = ((colorDomain, colorPalette, value) => {
			return quantizeScale(colorDomain, colorPalette, value);
		});
		
		this.state.features.polygonFeatures.forEach((item, index) => {
			let color = getCellColor(item.__source, sortedColorBins, colorScaleFunc, colorPalette, colorValueDomain);
			const cv = sortedColorBins.binMap[item.__source.index] && sortedColorBins.binMap[item.__source.index].value;
			let inflatedCV = Math.ceil(Math.pow(Math.E, cv));
			if(currentBins === undefined)
				currentBins = [];
			if(currentBins[color] === undefined)
				currentBins[color] = {min: inflatedCV, max: inflatedCV, count: Math.pow(Math.E, sortedColorBins.binMap[item.__source.index].value)};
			else
				{
					currentBins[color].min = Math.min(inflatedCV, currentBins[color].min);
					currentBins[color].max = Math.max(inflatedCV, currentBins[color].max);
					currentBins[color].count += Math.pow(Math.E, sortedColorBins.binMap[item.__source.index].value); 
				}
			if(clickedSectors[item.__source.object.properties.iso] !== undefined)
				item.__source.object.color = chroma('yellow').rgb();		
				//item.__source.object.color = chroma.blend(chroma(color), chroma.gl(255,255,0,0.2), 'lighten').rgb();
			else
				item.__source.object.color = color;

		});

		this.setState({...this.state, currentBins: currentBins});
	}
	
	getSortedColorBins() {
		const {getColorValue} = this.props;
		const sortedColorBins = new BinSorter(this.props.data.features || [], {
			getValue: getColorValue, 
			getPoints: (region) => {return region.points;}, 
			filterData: (points) => points.length});

		this.setState({sortedColorBins});
		this.getColorValueDomain();
	}

	getFillColorSortedBins(){
		if(this.state === null)
			return null;
		const {currentBins} = this.state;
		return currentBins;
	  }

	getCellColor(cell, sortedColorBins, colorScaleFunc, colorPalette, colorDomain) {
		const cv = sortedColorBins.binMap[cell.index] && sortedColorBins.binMap[cell.index].value;
		const isColorValueInDomain = Math.abs(cv) >= colorDomain[0] && Math.abs(cv) <= colorDomain[colorDomain.length - 1];

		// if cell value is outside domain, set alpha to 0
		const color = isColorValueInDomain && sortedColorBins.binMap[cell.index].value !== 0 ?
								 colorScaleFunc(colorDomain, colorPalette, cv) : [0, 0, 0, 0];
		// add alpha to color if not defined in colorRange
		color[3] = Number.isFinite(color[3]) ? color[3] : 255;

		return color;
	}
	
	getColorValueDomain() {
	      this.state.colorValueDomain = this.state.sortedColorBins.getValueRange([0, 100]);
	      this.getColorScale();
	}

	quantizeScale(domain, colorPalette, value){
		const domainRange = domain[1] - domain[0];
		if (domainRange <= 0) {
			//console.log('quantizeScale: invalid domain, returning range[0] (' + domain[1]  + " - " + domain[0] + ")");
			return colorPalette[0];
		}
		const step = domainRange / colorPalette.length;
		const idx = Math.floor((value - domain[0]) / step);
		const clampIdx = Math.max(Math.min(idx, colorPalette.length - 1), 0);
	
		return colorPalette[clampIdx];
	}
};

export {LocalGeoJsonLayer};