import React from "react";
import {Paper, Typography} from '@material-ui/core';
import {withStyles} from "@material-ui/core/styles";
import RcSlider from 'rc-slider';
import { ContinuousColorLegend } from 'react-vis';
import '../../node_modules/react-vis/dist/style.css';
import 'rc-slider/assets/index.css';
import 'rc-tooltip/assets/bootstrap.css';
import PropTypes from 'prop-types';

//import Chroma from "chroma-js";

import {greenScaleMin,/* redScaleMin,*/ greenScaleMax, redScaleMax} from './utils'
import {makeid, getSuffixString} from './utils'

const TIMELINE_SLIDER_STYLES = {
    root: {
        position: "absolute",
        backgroundColor: "#f5f5f5",
        borderRadius: "5px",
        opacity: "0.95",
        top: "10px",
        height:"70px",
        left:"3%",
        width:"59.5%",
        zIndex: 7,
    },
    timelineSlider: {
        margin:"5px 10px 10px 10px",
        padding:"0px 10px 10px 10px",
    },
    slider: {
        marginTop: "3px"
    },
    scalesContainer: {
        width: "100%",
        margin: "8px 10px 0px 10px",
        padding: "0px 10px 10px 10px",
    },
    timelineGuidanceScale: {
        display: "inline-block",
        height: "8px"
    },
    loadingAreaText: {
        textAlign: "center",
        fontSize: "9pt"
    },
    sliderTick: {
        color: '#607d8b', fontSize:'medium', fontWeight:"bold", top:"-5px"
    },
    eventValue: {
        fontSize: "small",
        fontWeight: "bold"
    },
    loadingTopBar:{
        width: "100%",
        height: "5px",
        background: "linear-gradient(270deg, #0c87ff, #33ebff, #0c87ff)",
        backgroundSize: "600% 600%",
        animation: "flatLoadingAnimation 1.5s ease infinite"      
    },
    '@keyframes flatLoadingAnimation': {
        '0%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' },
        '100%': { backgroundPosition: '0% 50%' },
    }

}

const legendPropTypes = {
    className: PropTypes.string,
    height: PropTypes.number,
    endColor: PropTypes.string,
    endTitle: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
      .isRequired,
    midColor: PropTypes.string,
    midTitle: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    startColor: PropTypes.string,
    startTitle: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
      .isRequired,
    width: PropTypes.string
  };

ContinuousColorLegend.propTypes = legendPropTypes;


class TimelineSliderComp extends React.Component {
	_onCurrDateChange = value => {
        const {layerCfg} = this.props;
        /*let y1 = parseTimeline(layerCfg.currDate).year;
        let y2 = parseTimeline(value).year;
        let refresh = y1 !== y2;*/
        const currLayerCfg = {
                ...layerCfg,
                currDate: value
        };
        this.props.onLayerCfgChange(currLayerCfg, { updateDisplayedFirms: true, clearClickIfProximity: true });
        
	};

	render() {
		const { classes } = this.props;
        const { layerCfg, timePoints, dataPoints } = this.props;

        let intervals = [];
        let lastColor = greenScaleMin, targetColor;

        if(dataPoints !== undefined && dataPoints !== null)
            for(let j = 0; j < dataPoints.length -1; j++){
                if(dataPoints[j+1] > dataPoints[j])
                    targetColor = greenScaleMax;
                else if(dataPoints[j+1] < dataPoints[j])
                    targetColor = redScaleMax;
                else
                    targetColor = "gray";

                let stringValue = getSuffixString(dataPoints[j])  
                let nxtStringValue = getSuffixString(dataPoints[j + 1]) 
                intervals.push(
                    <ContinuousColorLegend className={classes.timelineGuidanceScale} key={makeid(5)}
                    width={parseFloat(100/(dataPoints.length - 1))+"%"}
                    height={8}
                    startColor={lastColor}
                    endColor={targetColor} 
                    startTitle={
                        <Typography className={classes.eventValue}>{j === 0 ? stringValue[0] + stringValue[1] : ""}</Typography>
                    }
                    endTitle={<Typography className={classes.eventValue}>{nxtStringValue[0] + nxtStringValue[1]}</Typography>}               
                />              
                );
                lastColor = targetColor; 
            }

		var marks = {};
		timePoints.forEach((value, idx) => {
			marks[value] = {label: <Typography className={classes.sliderTick}>{value}</Typography>};
		});
		return (
				<Paper className={classes.root}>                  
				<div className={classes.timelineSlider}>
                    <div style={{paddingTop: "4px"}}>
                        {intervals}
                    </div>
                    <RcSlider className={classes.slider}
                    min={timePoints[0]}
                    max={timePoints[timePoints.length - 1]}
                    defaultValue={layerCfg.currDate}
                    included={true}
                    marks={marks}
                    step={0.05}
                    trackStyle={{ backgroundColor: '#2196f3', height: 5 }}
                    handleStyle={{
                        borderColor: '#e0e0e0',
                        height: 20,
                        width: 20,
                        marginLeft: 0,
                        marginTop: -7,
                        backgroundColor: '#2196f3',
                    }}
                    railStyle={{ backgroundColor: '#bbdefb', height: 4 }}
                    onChange={this._onCurrDateChange}
                    />                    
                    </div>
				</Paper>
		);
	}
}

const TimelineSliderWGuidance = withStyles(TIMELINE_SLIDER_STYLES)(TimelineSliderComp);
export {TimelineSliderWGuidance};
