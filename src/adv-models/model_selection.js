import React from "react";
import { withStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWrench, faQuestionCircle, faTrash } from '@fortawesome/free-solid-svg-icons'
import Floater from 'react-floater';

import {Button, Paper, IconButton} from '@material-ui/core';
import {COMMON_SWITCH_STYLES} from '../panels/utils'
import { generateModelId } from "./adv_model_loader";
//import layer from "@deck.gl/core/dist/es5/lib/layer";

const MODELS_PANEL_STYLES = {
    heading_withmargin: {
        margin: "15px 0px 0px 0px",
    },
    generalInfo: {
        textAlign: 'left',
		display: 'block',
		padding: "3px 6px",
        /*opacity: "0.85",
        position: "absolute",
		bottom: "50px",*/
		width: '99%',
		zIndex: 8,
        borderTop: "solid #212121 4px"
    },
    table_heading: {
		textAlign: "center",
		fontWeight: "bold",
		fontSize: "small"		
    },
    modelSelector: {
        width: "100%"
    },
    modelOptionsPanelContainer: {
        width: '110%',
        position: 'absolute',
        top: '10%',
        left: '-110%',
        zIndex: '15000'
    },
    modelOptionsPanel: {
        width: '91%',
        padding: '9px',
    },
    text: {
        fontSize: "15px",
        color: "#2196f3",
        fontFamily: "Monospace",
    },
    icon: {
        paddingLeft: "5px",
        paddingRight: "5px"
    },
    modelSelectBox: {
        width: "80%"
    },
    addButton: {
        width: "19%",
        float: "right"
    },
    applyButton: {
        width: "48%",
        margin: "3px"
    },
    formControl: {
        display: "inline-block"
    },
    smallText: {
        fontStyle: 'italic',
        fontSize: 'small'
    },
    modelSwitch: {
        float: 'right'        
    },
    singleLoadedModel: {
        width: '49%',
        display: 'inline-table',
        border: 'solid gray 1px',
        marginBottom: '2px',
        marginRight: '2px',
        height: '110px',
        padding: '1px',
        overflowY: 'scroll'
    },
    modelsButtons: {
        float: "right"
    },
    modelsContainer: {
        width: '100%',
    }

}

class ConstraintSwitch extends React.Component {

    constructor(props){
        super(props);
        this.state = {constraint: props.constraintId, value: props.initValue}
    }

    render(){
        const {constraint, value} = this.state;
        const {modelSwitches, classes, onChangedModelSwitch} = this.props;
        return (
            <Switch      
            value={value}
            checked={value === "1"}
            classes={{
                switchBase: classes.timelineSwitchBase,
                checked: classes.timelineChecked,
                track: classes.timelineBar,
            }}
            onChange={(e) => {
                let newValue = e.target.checked ? "1" : "0";
                modelSwitches[constraint] = newValue;
                this.setState({...this.state, value: newValue});
                onChangedModelSwitch(modelSwitches);
            }}                       
        />
        );
    }
}


class ModelSwitch extends React.Component {

    constructor(props){
        super(props);
        this.state = {model_name: props.model_name, model_id: props.model_id, value: props.initValue}
    }

    render(){
        const {value, model_name, model_id} = this.state;
        const {classes, onChangedDisplayedModels} = this.props;
        return (
            <Switch          
            size="small"
            value={value}
            checked={value === "1"}
            classes={{
                switchBase: classes.timelineSwitchBase,
                checked: classes.timelineChecked,
                track: classes.timelineBar,
            }}
            onChange={(e) => {
                let newValue = e.target.checked ? "1" : "0";
                onChangedDisplayedModels(model_name, model_id, newValue)
                this.setState({...this.state, value: newValue});
            }}                       
        />
        );
    }
}

class ModelsPanel extends React.Component {

    constructor(props) {
        super(props);
        const {layerCfg} = this.props;
        let optsStore = layerCfg.model_selector;
        this.state = {newModel: optsStore === undefined || optsStore.newModel === undefined ? false : optsStore.newModel,
                      selectedNewModel: optsStore === undefined || optsStore.selectedNewModel === undefined ? "_undefined" : optsStore.selectedNewModel,
                      selectedModel: optsStore === undefined || optsStore.selectedModel === undefined ? undefined : optsStore.selectedModel};
    }

    _onNewModelSelected = (event) => {
        const { layerCfg, onLayerCfgStateChanged, adv_models } = this.props;
        const { selectedNewModel } = this.state;
        let switches = [];        
        this.newModel = true;
        for(let i=0; i<adv_models[selectedNewModel].constraints.length; i++)
            switches[i] = "1";
        this.setState({...this.state, newModel: true, selectedModel: {
            name: selectedNewModel, switches: switches
        }}, () => {
            onLayerCfgStateChanged({...layerCfg, model_selector: {...layerCfg.model_selector, newModel: true, selectedModel: {
                name: selectedNewModel, switches: switches}}});        
        });
    };

    _onModelSelected = (model_name, model_id,e) => {
        const {layerCfg, onLayerCfgStateChanged} = this.props;
        let switches = model_id.split("_");
        /*for(let i=0; i<switches_explode.length; i++)
           switches[i] = switches_explode === "1" ? true : false;*/
        this.setState({...this.state, newModel: false, selectedModel: {
            name: model_name, switches: switches, model_id: model_id
        }}, () => {
            onLayerCfgStateChanged({...layerCfg, model_selector: {...layerCfg.model_selector, newModel: false, selectedModel: {
                name: model_name, switches: switches, model_id: model_id}}});        
        });
    }

    _onModelRemoved = (model_name, model_id, showSpinner = false) => {
        const{visible_models, onModelDeleted, layerCfg} = this.props;
        visible_models[model_name][model_id] = undefined;
        const currLayerCfg = {
            ...layerCfg,
            visible_models: visible_models,
            showSpinner: showSpinner
        };
        onModelDeleted(currLayerCfg, {invalidateOverlapMap: true, transactionsRecomputed: true});        
    }


    _onModelOptionsChanged = (e) => {
        const {selectedModel} = this.state;
        const {onNewModelAdded, visible_models/*, layerCfg, onLayerCfgStateChanged*/} = this.props;
        //this._onModelRemoved(selectedModel.name, selectedModel.model_id, true);
        visible_models[selectedModel.name][selectedModel.model_id] = undefined;
        onNewModelAdded(selectedModel, visible_models);
    };

    _onChangedDisplayedModels = (model_name, option_id, newValue) => {
        const { visible_models, layerCfg, onModelStateChanged } = this.props;
        let modelObj =  visible_models[model_name][option_id];
        if (newValue === "1"){
            visible_models[model_name][option_id] = {...modelObj, active: true};
        }else{
            visible_models[model_name][option_id] = {...modelObj, active: false};
        }
        const currLayerCfg = {
            ...layerCfg,
            visible_models: visible_models
        };
        onModelStateChanged(currLayerCfg, {invalidateOverlapMap: true, transactionsRecomputed: true});
    }

    render() {

        const { layerCfg, adv_models, visible_models, onNewModelAdded, onLayerCfgStateChanged, classes } = this.props;
        const { selectedModel, selectedNewModel, newModel } = this.state;

        if (adv_models === undefined) {
            return (<div>No models found</div>);
        } else {
            var modelOptionsPanel = ("");
            var modelsListSubpanel = ("");
            if (selectedModel !== undefined) {
                let options = [];
                let modelSwitches = selectedModel.switches;
                for (let constraint_idx in adv_models[selectedModel.name].constraints) {
                    let constraint = adv_models[selectedModel.name].constraints[constraint_idx];
                    options.push(
                        <FormControlLabel key={makeid(5)}
                            control={
                                <StyledConstraintSwitch key={makeid(5)} 
                                                        className={classes.modelSwitch} 
                                                        constraintId={constraint_idx} 
                                                        modelSwitches={modelSwitches} 
                                                        initValue={modelSwitches[constraint_idx]} 
                                                        onChangedModelSwitch={(updModelSwitches) => {
                                                                                                this.setState({...this.state, selectedModel: {...selectedModel, switches: updModelSwitches}}, () =>
                                                                                                    {                                                                                                        
                                                                                                        onLayerCfgStateChanged({...layerCfg, model_selector: {...layerCfg.model_selector, newModel: this.state.newModel, selectedModel: {
                                                                                                        ...this.state.selectedModel, switches:  updModelSwitches}}});      
                                                                                                    });
                                                                                                }}
                                                        />
                            }
                            label={
                                <Typography key={makeid(5)} className={classes.label}>{constraint.name}<br/>
                                    <span key={makeid(5)} className={classes.smallText}>{constraint.description}</span>
                                </Typography>                                
                            }
                            labelPlacement="end"
                        />
                    );
                }
                if(options.length === 0)
                    options.push(
                        <div>
                            <Typography className={classes.smallText}>
                                This model does not support constraints.
                            </Typography>
                        </div>
                    );
                let generatedModelId = generateModelId(selectedModel.switches);
                let existingModelCondition = generatedModelId === undefined || (layerCfg.visible_models[selectedModel.name] !== undefined && 
                                            layerCfg.visible_models[selectedModel.name][generatedModelId] !== undefined);
                modelOptionsPanel = (
                    <div key={makeid(5)} className={classes.modelOptionsPanelContainer}>
                        <Paper variant="outlined" className={classes.modelOptionsPanel}>
                            {options}
                            <Button disabled={existingModelCondition} className={classes.applyButton} onClick={(event) => newModel ? onNewModelAdded(selectedModel) : this._onModelOptionsChanged(event)}>{!existingModelCondition ? (newModel ? "Add" : "Apply") : (generatedModelId === undefined ? "Activate at least a constraint" : "Model already loaded!")}</Button>
                            <Button className={classes.applyButton} onClick={(event) => {
                                    onLayerCfgStateChanged({...layerCfg, model_selector: {}});
                                    this.setState({newModel: false, selectedNewModel: "_undefined", selectedModel: undefined});
                                }
                            }>Cancel</Button>                    
                        </Paper>
                    </div>
                );
            }

            if (visible_models !== undefined) {
                let modelsListElements = [];
                for(let f in visible_models){
                    for(let c in visible_models[f]){
                        let currentModel = visible_models[f][c];
                        if(currentModel === undefined)
                            continue;
                        let modelOptions = c.split("_");
                        let displayedOptions = [];
                        for(let t in modelOptions)
                            if(modelOptions[t] === "1")
                                displayedOptions.push(
                                    <Typography key={makeid(5)} className={classes.smallText}>{adv_models[f].constraints[t].name}
                                        <Floater key={makeid(5)} content={
                                            (<span className={classes.text}>{adv_models[f].constraints[t].description}</span>)}>
                                            <span><FontAwesomeIcon className={classes.icon} icon={faQuestionCircle}></FontAwesomeIcon></span>
                                        </Floater>
                                    </Typography>
                                );
                        let id = makeid(5);
                        modelsListElements.push(
                            <div className={classes.singleLoadedModel} key={makeid(5)}>
                                <StyledModelSwitch key={makeid(4)}
                                    onChangedDisplayedModels={this._onChangedDisplayedModels}
                                    model_id={c}
                                    model_name={f}
                                    initValue={currentModel.active ? "1" : "0"}                                  
                                />                                
                                <label htmlFor={id} className={classes.modelLabel}>{currentModel.name}</label>
                                <IconButton size="small" model_name={f} option_id={c} className={classes.modelsButtons} onClick={(e) => this._onModelSelected(e.currentTarget.getAttribute("model_name"), e.currentTarget.getAttribute("option_id"), e)}><FontAwesomeIcon className={classes.icon} icon={faWrench} /></IconButton>
                                <IconButton size="small" model_name={f} option_id={c} className={classes.modelsButtons} onClick={(e) => this._onModelRemoved(e.currentTarget.getAttribute("model_name"), e.currentTarget.getAttribute("option_id"), e)}><FontAwesomeIcon className={classes.icon} icon={faTrash} /></IconButton>
                                {displayedOptions}
                            </div>
                        );
                    }
                }
                if(modelsListElements.length > 0)
                    modelsListSubpanel = (
                        <div className={classes.generalInfo}>
                            <Typography className={classes.table_heading}>Loaded Models</Typography>
                            <div className={classes.modelsContainer}>
                                {modelsListElements}
                            </div>		
                        </div>
                    );
            }
            let models = [];
            models.push(
                <MenuItem key="_undefined" value="_undefined">
                    <Typography className={classes.textContent}>Select... </Typography>
                </MenuItem>);            
            for (let m_index in adv_models) {
                models.push(
                    <MenuItem key={m_index} value={m_index}>
                        <Typography className={classes.textContent}>{m_index}</Typography>
                    </MenuItem>);
            }
            return [
                    (
                        <div className={classes.modelSelector} key={makeid(7)}>
                            <FormControl className={classes.generalInfo}>
                            <Typography className={classes.table_heading}>Add New Model</Typography>		
                                <Select
                                    className={classes.modelSelectBox}
                                    inputProps={{
                                        name: 'new-model-option',
                                        id: 'new-model-option',
                                    }}
                                    value={selectedNewModel}
                                    onChange={(event) => this.setState({...this.state, selectedNewModel: event.target.value}, () => {
                                        
                                        onLayerCfgStateChanged({...layerCfg, model_selector: {...layerCfg.model_selector, selectedNewModel: event.target.value}});
                                    })}
                                >
                                    {models}
                                </Select>
                                <Button disabled={selectedNewModel === "_undefined"} onClick={(event) => this._onNewModelSelected(event)} className={classes.addButton}>Customize</Button>
                            </FormControl>
                            {modelsListSubpanel}
                        </div>
                    ),
                    modelOptionsPanel
                ];
        }
    }
}

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }
 
const ModelsSelector = withStyles(MODELS_PANEL_STYLES)(ModelsPanel);
const StyledConstraintSwitch = withStyles(COMMON_SWITCH_STYLES)(ConstraintSwitch);
const StyledModelSwitch = withStyles(COMMON_SWITCH_STYLES)(ModelSwitch);

export { ModelsSelector };