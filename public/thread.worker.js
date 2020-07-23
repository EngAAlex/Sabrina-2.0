self.importScripts('./Strategies.js');

var groupedValueStrats = getSelectedGroupingStrategies();

self.addEventListener("message", ({ data }) => {
    console.log("message received -- Paolo lo ciuccia");
    const { localFirms, timePoints, layerCfg, groupingStrategy } = data;
    if (type === 'UPDATE') {
        if(layerCfg.currentGroupingStrategy === undefined)
            return[];        
        let yearlyDataPoints = timePoints.map((timePointElement, timePointIndex) => {
            let firms = localFirms.filter((firmElement, firmIndex) => {
                return groupedValueStrats[groupingStrategy].filterFunction(firmElement, layerCfg, {...DEFAULT_STRATEGY_OPTIONS,
                                                                                                                negateLocalArcVisible: true,
                                                                                                                pushAttributes: false, 
                                                                                                                dateOverride: {year: timePointElement}
                                                                                                                });
            });
            return groupedValueStrats[groupingStrategy].getColorValue(firms, {...DEFAULT_STRATEGY_OPTIONS, 
                                                                                            year: timePointElement,
                                                                                            models: layerCfg.visible_models});
        });
        console.log("work complete -- Paolo lo ciuccissima");
        self.postMessage({ type: 'UPDATE_SUCCESS', payload: yearlyDataPoints });
    }
    });
  
  self.addEventListener(
    "exit",
    () => {
      process.exit(0);
    },
    false
  );
  