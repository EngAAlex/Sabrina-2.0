import React  from 'react';
//import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { /*DetailsPanel,*/ StyledFirmsTable, StyledTransactionsTable } from './sector_details';
import { Tabs, Tab, AppBar, ExpansionPanel, ExpansionPanelSummary,
         ExpansionPanelDetails, Typography, Box } from '@material-ui/core';
import { withStyles } from "@material-ui/core/styles";
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import { ModelsSelector } from '../adv-models/model_selection';
//import { select } from 'd3';
import { makeid } from './utils';

const ANALYTICS_STYLE = {
    root: {
        textAlign: 'left',
        display: 'block',
        opacity: "0.95",
        position: "absolute",
        top: "10px",
        right: "1%",
        zIndex: 8,
        width: "36%"
    },
    button: {
        color: '#607d8b',
        opacity: '0.75',
        zIndex: 9,
    },
    formControl: {
        padding: "5px 5px",
        width: 220,
    },
    tab: {
        width: "100%",
        padding: "0px 6px",
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
};


function TabPanel(props) {
    const { children, value, index, ...other } = props;
  
    return (
      <Typography key={makeid(5)}
        component="div"
        role="tabpanel"
        hidden={value !== index}
        id={`tab-analytics-panel-${index}`}
        aria-labelledby={`analytics-panel-tabpanel-${index}`}
        {...other}
      >
        {value === index && <Box key={makeid(5)} p={3}>{children}</Box>}
      </Typography>
    );
  }

  TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
  };

class AnalyticsPanel extends React.Component{

    constructor(props){
        super(props);
        this.state={value: 0};
    }

    _onStateChange = (event, newValue) => {
        this.setState({...this.state, value: newValue});
    }

    _a11yProps = (index) => {
        return {
          id: `tab-analytics-panel-${index}`,
          'aria-controls': `analytics-panel-tabpanel-${index}`,
        };
      }

    render(){
        const {classes,/* colorLegend,*/ addNewModel, clickedSectors,
               layerCfg, updateLayerCfg, adv_models, localFirms, transactions, selectedStrategy, displayedFirms} = this.props;
        const { value } = this.state;
        /*let detailsPanel = 
            Object.entries(clickedSectors).length > 0 ?						
                (<DetailsPanel
                    localFirms={localFirms}
                    clickedSectors={clickedSectors}
                    colorLegend={colorLegend}
                    transactions={transactions}
                    updateSelectedTransactions={(transaction) => updateLayerCfg({...layerCfg, selectedTransaction: transaction}, false)}
                    selectedStrategy={selectedStrategy}
                    onLayerCfgStateChanged={(layerCfg) => updateLayerCfg(layerCfg, {})}
                    layerCfg={layerCfg}
                />) : (<div>
                        <Typography className={classes.text}>
                            Please click a on sector/region
                        </Typography>
                    </div>);
        */
        return (
            <div className={classes.root}>
            <ExpansionPanel key="list_root">
                <ExpansionPanelSummary 
                expandIcon={<ExpandMoreIcon />}>
                    <Typography className={classes.heading}>Analytics Panel</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails className={classes.container}>      
                    <AppBar position="static" color="default">
                        <Tabs
                        variant="fullWidth"
                        value={value}
                        onChange={this._onStateChange}
                        aria-label="analytics-panel"
                        className={classes.tabs}
                        centered
                        >
                            <Tab label="Selected Firms" {...this._a11yProps(0)} />
                            <Tab label="Transactions" {...this._a11yProps(1)} />                
                            <Tab label="Model Selection" {...this._a11yProps(2)} />                                    
                        </Tabs>
                        <TabPanel key={makeid(5)} className={classes.tab} value={value} index={0}>
                            <StyledFirmsTable 
                                clickedSectors={clickedSectors}
                                localFirms={localFirms}
                                selectedStrategy={selectedStrategy}
                                layerCfg={layerCfg}
                                onLayerCfgStateChanged={(layerCfg) => updateLayerCfg(layerCfg, {})}
                                displayedFirms={displayedFirms}
                            />	
                        </TabPanel>
                        <TabPanel key={makeid(5)} className={classes.tab} value={value} index={1}>
                            <StyledTransactionsTable 
                                transactions={transactions.data}
                                localFirms={localFirms}
                                updateSelectedTransactions={(transaction) => updateLayerCfg({...layerCfg, selectedTransaction: transaction}, false)}
                                layerCfg={layerCfg}
                                onLayerCfgStateChanged={(layerCfg) => updateLayerCfg(layerCfg, {})}		
                                bundledEdges={layerCfg.bundleEdges}		
                                displayedFirms={displayedFirms}
                            />
                        </TabPanel>
                        <TabPanel key={makeid(5)} className={classes.tab} value={value} index={2}>
                            <ModelsSelector 
                                adv_models={adv_models}
                                visible_models={layerCfg.visible_models}
                                layerCfg={layerCfg}
                                onNewModelAdded={addNewModel}
                                onModelStateChanged={(layerCfg, options) => updateLayerCfg(layerCfg, options)}
                                onModelDeleted={(layerCfg, options) => updateLayerCfg(layerCfg, options)}
                                onLayerCfgStateChanged={(layerCfg) => updateLayerCfg(layerCfg, {})}	
                            >
                            </ModelsSelector>
                        </TabPanel>
                    </AppBar>
            </ExpansionPanelDetails>
        </ExpansionPanel>
    </div>
    );

    }

}

const AnalyticsTabs = withStyles(ANALYTICS_STYLE)(AnalyticsPanel);
export {AnalyticsTabs};