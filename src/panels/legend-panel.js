import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { XAxis, FlexibleWidthXYPlot ,/* YAxis,*/ VerticalRectSeries } from "react-vis";
import Chroma from "chroma-js";
import {Paper, Typography} from "@material-ui/core";

import {getSuffixString} from "./utils"

const LEGEND_PANEL_STYLES = {
    root: {
        textAlign: 'left',
        display: 'block',
        opacity: "0.95",
        position: "absolute",
        bottom: "10px",
        right: "1%",
        zIndex: 8,
        width: "36%"
    },
    heading: {
        textAlign: "center",
        fontWeight: "bold",
        fontSize: "small",
    },
    charts: {
        background: 'white',
        borderRadius: 3,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        //fontFamily:
        //  'ff-clan-web-pro, "Helvetica Neue", Helvetica, sans-serif !important',
        fontSize: '12px',
        lineHeight: 1.833,
        height: 60,
        padding: '10px',
        //position: 'absolute',
        right: 20,
        bottom: 20,
        width: 300,
        zIndex: 100
    }
    
}

class ColorLegendPaper extends React.Component {


    render(){
        const { classes, bins } = this.props;

        if(bins === undefined || Object.entries(bins).length === 0)
            return ("");

        let col_bins = [];
        for(let d in bins) {
            col_bins.push({count:bins[d].count, val0: bins[d].min, val: bins[d].max, color: d, y0: 0, y: 30});
        }

        col_bins.sort((o1, o2) => {
            if(o1 === o2)
                return 0;
            if(o1.val0 < o2.val0)
                return -1;
            else if(o1.val0 > o2.val0)
                return 1
            else
                return 0;
        });

        let remainder = 0;
        const ch_data = col_bins.map((d, ind) => {  
            let logVal = Math.log(d.val);              
            let val = { ...d, x0: remainder, x: logVal, oVal: d.val, color: Chroma(d.color.split(",").slice(0,3)).hex() };
            remainder = logVal;
            return val;
        });
        let ticks1 = ch_data.filter((d,ind) => ind%2 === 0).map((d) => d.x,);
        let ticks2 = ch_data.filter((d,ind) => ind%2 === 1).map((d) => d.x,);
        //ticks.push(ch_data[ch_data.length-1].val);
        /*const ch_data_r = col_bins.map(d => {
            let color = redScale(d.x0 ).hex();
            d.y0 = d.y;
            d.y = d.y*2;
            return { ...d, color };
        });*/

        return (
                <Paper variant="outlined" className={classes.root}>
                    <Typography className={classes.heading}>Map Legend</Typography>
                    <FlexibleWidthXYPlot
                        getX={d => d.x}
                        getY={d => d.y}
                        margin={{ left: 10, right: 25, top: 0, bottom: 25 }}
                        height={60}
                        yDomain={[0, 100]}
                    >
                        <XAxis
                        style={{
                            ticks: {stroke: '#ADDDE1'},
                            text: {fontFamily: "Roboto", stroke: 'none', fill: 'black', fontWeight: 'bold', fontSize: '13px'}}}
                        tickFormat={d => {
                            let arr = getSuffixString(Math.ceil(Math.pow(Math.E ,d)));
                            return arr[0]+arr[1];
                        }}
                        tickValues={ticks2}
                        tickLabelAngle={0}
                        tickPadding={-30}
                        />                        
                        <VerticalRectSeries
                        colorType="literal"
                        data={ch_data}
                        style={{ cursor: 'pointer' }}
                        />
                        <XAxis
                        style={{
                            ticks: {stroke: '#ADDDE1'},
                            text: {fontFamily: "Roboto", stroke: 'none', fill: 'black', fontWeight: 'bold', fontSize: '13px'}}}
                        tickFormat={d => {
                            let arr = getSuffixString(Math.ceil(Math.pow(Math.E ,d)));
                            return arr[0]+arr[1];
                        }}
                        tickValues={ticks1}
                        tickLabelAngle={0}
                        tickPadding={0}
                        />
                    </FlexibleWidthXYPlot>
                </Paper>
                );
    }
}

const LegendPaper = withStyles(LEGEND_PANEL_STYLES)(ColorLegendPaper);
export { LegendPaper };
