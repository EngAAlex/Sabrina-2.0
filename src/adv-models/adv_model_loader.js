import CSV from '../csv.js';

export class AdvModelLoader {

    state = {loading_max_stage: 0, current_loading_stage: 0, currentArrayOfFiles: []}

    _loadSingleModel = async (localFirms, modelLabel, modelId, files_array, finalCallback, updLoadingTextCallback) =>{
        this.state = {loadingTextUpd: updLoadingTextCallback, callback: finalCallback, modelLabel: modelLabel, modelId: modelId, 
                        localFirms: localFirms, loading_max_stage: files_array.length, current_loading_stage: 0, 
                        currentArrayOfFiles: files_array, currentAggregatedData: {totalTransactions: 0, sectorMap: {sources: new Map(), sinks: new Map()}, companySizesMap: new Map(), aggregationArray: []}};
        this._load_model_file();
    }

    _load_model_file = () => {
        const {modelLabel, currentArrayOfFiles, modelId, localFirms, current_loading_stage} = this.state;
        let year = currentArrayOfFiles[current_loading_stage].match(/year\d\d\d\d/)[0].slice(4);
        CSV._loadJSONModel(modelLabel, currentArrayOfFiles[current_loading_stage], (data) => {
            let totalTransactions = 0;
            let sourceSectorMap = new Map();
            let targetSectorMap = new Map();
            let companySizesMap = new Map();
            let aggregationArray = [];
            for(let firm in data) {
                //let source_id = parseInt(firm);
                let source = data[firm].sabina_id;
                let edges = data[firm].outflows;
                for(let j=0; j<edges.length; j++){
                    if(j === firm)
                        continue;                  
                   // var target_id = j+"";
                    var target = data[j+""].sabina_id;
                    var amount = edges[j];
                    
                    if (isNaN(year) || isNaN(target) || isNaN(source) || isNaN(amount) || amount === 0)
                        continue;
                    let source_firm_element = localFirms.get(parseInt(source));
                    let target_firm_element = localFirms.get(parseInt(target));

                    if (source_firm_element === undefined || target_firm_element === undefined)
                        continue;

                    /* MODEL STATISTICS BUILDUP */
                    
                    /*
                        TOTAL # OF TRANSACTIONS
                    */
                    
                    totalTransactions++;

                    /*
                        SECTOR BY SECTOR MAP
                    */

                    let sourceSector = source_firm_element.edv_e1, targetSector = target_firm_element.edv_e1;
                    let sectorMap = sourceSectorMap;                
                    
                    if(!sectorMap.has(sourceSector)){
                        sectorMap.set(sourceSector, new Map());
                    }
                    let givingSector = sectorMap.get(sourceSector);   

                    if(!givingSector.has(targetSector)){
                        givingSector.set(targetSector, {transactions: 1, amount: amount});
                    }else{
                        let receivingSector = givingSector.get(targetSector);
                        ++receivingSector.transactions;
                        receivingSector.amount += amount;
                    }

                    sectorMap = targetSectorMap;                

                    if(!sectorMap.has(targetSector)){
                        sectorMap.set(targetSector, new Map());
                    }
                    let receivingSector = sectorMap.get(targetSector);   

                    if(!receivingSector.has(sourceSector)){
                        receivingSector.set(sourceSector, {transactions: 1, amount: amount});
                    }else{
                        let givingSector = receivingSector.get(sourceSector);
                        ++givingSector.transactions;
                        givingSector.amount += amount;
                    }

                    /*
                        REGION MAP
                    */

                    for(let aggr in source_firm_element.regions){
                        let sourceAreaCode = source_firm_element.regions[aggr];
                        let targetAreaCode = target_firm_element.regions[aggr];

                        if(aggregationArray[aggr] === undefined)
                            aggregationArray[aggr] = {sources: new Map(), sinks: new Map()};

                        let aggregationMap = aggregationArray[aggr].sources;                                          
                        if(!aggregationMap.has(sourceAreaCode))
                            aggregationMap.set(sourceAreaCode, new Map());
                        
                        let givingArea = aggregationMap.get(sourceAreaCode);
                        if(!givingArea.has(targetAreaCode)){
                            givingArea.set(targetAreaCode, {transactions: 1, amount: amount})
                        }else{
                            let receivingArea = givingArea.get(targetAreaCode);
                            ++receivingArea.transactions;
                            receivingArea.amount += amount;
                        }

                        aggregationMap = aggregationArray[aggr].sinks;  
                        
                        if(!aggregationMap.has(targetAreaCode))
                            aggregationMap.set(targetAreaCode, new Map());
                        
                        let receivingArea = aggregationMap.get(targetAreaCode);

                        if(!receivingArea.has(sourceAreaCode)){
                            receivingArea.set(sourceAreaCode, {transactions: 1, amount: amount})
                        }else{
                            let givingArea = receivingArea.get(sourceAreaCode);
                            ++givingArea.transactions;
                            givingArea.amount += amount;
                        }
                    }

                    if(source_firm_element.edges[modelLabel] === undefined)
                        source_firm_element.edges[modelLabel] = [];
                    if(target_firm_element.edges[modelLabel] === undefined)
                        target_firm_element.edges[modelLabel] = [];

                    let modelFamily = source_firm_element.edges[modelLabel];
                    let model = modelFamily[modelId];

                    if(model === undefined)
                        modelFamily[modelId] = [];
                    model = modelFamily[modelId];
                    if (model[year] === undefined)
                        model[year] = [];
                    /*if (model[year][target] === undefined)
                        model[year][target] = {};*/
                    model[year][target] = amount*-1;
                        
                    if(target_firm_element.edges[modelLabel] === undefined)
                        target_firm_element.edges[modelLabel] = [];
                    let targetModelFamily = target_firm_element.edges[modelLabel];
                    let target_model = targetModelFamily[modelId];
                    
                    if(target_model === undefined)
                        targetModelFamily[modelId] = [];
                    target_model = targetModelFamily[modelId];                        
                    if (target_model[year] === undefined)
                        target_model[year] = [];
                    /*if (target_model[year][source] === undefined)
                        target_model[year][source] = {};*/
                    target_model[year][source] = amount;
                }
            }
            let sectorMap = {sources: sourceSectorMap, sinks: targetSectorMap};
            this._update_singleModel_loading({totalTransactions, sectorMap, aggregationArray, companySizesMap});
        });
    }

    _update_singleModel_loading = (tmpAggregatedData, updLoadingText) => {
        const {callback, current_loading_stage, modelLabel, loading_max_stage, currentAggregatedData, loadingTextUpd} = this.state;
        const {sectorMap, aggregationArray} = tmpAggregatedData;
        //console.log("Complete " + Number.parseInt((current_loading_stage + 1) / loading_max_stage*100) + "%");
        loadingTextUpd("Loading " + modelLabel + " -- Complete " + Number.parseInt((current_loading_stage + 1) / loading_max_stage*100) + "%")
        /*
            ### INCREMENT STATISTICS

            TOTAL TRANSACTIONS
        */
       tmpAggregatedData.totalTransactions += currentAggregatedData.totalTransactions;
       
        /*
            SECTOR MAP
        */
        
        let currentSectorMap = currentAggregatedData.sectorMap.sources;
        let tmpSectorMap = sectorMap.sources;
        for(let key in currentSectorMap.keys()){
            let currentValue = currentSectorMap.get(key);
            if(!tmpSectorMap.has(key))
                tmpSectorMap.set(key, currentValue);
            else{
                let tempValue = tmpSectorMap.get(key);
                tmpSectorMap.set(key, {
                    transactions: tempValue.transactions + currentValue.transactions,
                    amount: tempValue.amount + currentValue.amount
                });
            }
        }

        currentSectorMap = currentAggregatedData.sectorMap.sinks;
        tmpSectorMap = aggregationArray.sinks;
        for(let key in currentSectorMap.keys()){
            let currentValue = currentSectorMap.get(key);
            if(!tmpSectorMap.has(key))
                tmpSectorMap.set(key, currentValue);
            else{
                let tempValue = tmpSectorMap.get(key);
                tmpSectorMap.set(key, {
                    transactions: tempValue.transactions + currentValue.transactions,
                    amount: tempValue.amount + currentValue.amount
                });
            }
        }

        /*
            AREA MAP
        */
        for(let aggr in currentAggregatedData.aggregationArray){
            let currentMapObj = currentAggregatedData.aggregationArray[aggr];
        if(aggregationArray[aggr] === undefined)
            aggregationArray[aggr] = currentMapObj;
        else{
            let currentTempMap = currentMapObj.sources;
            let currentMap = currentMapObj.sources;
            for(let key in currentMap.keys()){
                let currentValue = currentMap.get(key);
                if(!currentTempMap.has(key))
                    currentTempMap.set(key, currentValue);
                else{
                    let tempValue = currentTempMap.get(key);
                    currentTempMap.set(key, {
                        transactions: tempValue.transactions + currentValue.transactions,
                        amount: tempValue.amount + currentValue.amount
                    });
                    }
                }  
                
            currentTempMap = currentMapObj.sinks;
            currentMap = currentMapObj.sinks;
            for(let key in currentMap.keys()){
                let currentValue = currentMap.get(key);
                if(!currentTempMap.has(key))
                    currentTempMap.set(key, currentValue);
                else{
                    let tempValue = currentTempMap.get(key);
                    currentTempMap.set(key, {
                        transactions: tempValue.transactions + currentValue.transactions,
                        amount: tempValue.amount + currentValue.amount
                    });
                    }
                }
            }
        }

        if(current_loading_stage + 1 === loading_max_stage){
            callback(tmpAggregatedData);
            this._clearState();
        }else{
            this.state = {...this.state, current_loading_stage: (current_loading_stage + 1), currentAggregatedData: tmpAggregatedData};
            this._load_model_file();
        }
    }

    _clearState = () => {
        this.state = {loading_max_stage: 0, current_loading_stage: 0, currentArrayOfFiles: []}
    }

    static _loadModelSignature = async (model_name, callback) => {
        CSV._importJSON("csv/models/"+model_name+"/"+model_name+".json",
            (data) => {
                let files = {};
                
                for(let index in data.models){
                    let current = data.models[index];
                    files[generateModelId(current.constraints)] = current.models;
                }
    
                callback({name: data.name, constraints: data.constraints, files: files});
                
            });
    }

}

export function generateModelId(constraints){
    let result = "";
    let allZeroes = true;
    for(let c in constraints){
        let value = getConstraintValue(constraints[c]);
        if(value !== 0)
            allZeroes = false;
        if(result === "")
            result += value;
        else
            result += "_" + value;
    }
    return allZeroes ? undefined : result;
}

function getConstraintValue(constraint){
    switch(constraint.type){
        case "switch": return getSwitchValue(constraint);
        case "range" : break;
        default : return getSwitchValue(constraint);
    }
}

function getSwitchValue(constraint){
    return constraint === "1" || constraint.enabled ? 1 : 0;
}