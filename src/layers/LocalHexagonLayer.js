import {HexagonLayer, _CPUAggregator as CPUAggregator} from '@deck.gl/aggregation-layers';
import chroma from 'chroma-js';

const defaultDimensions = [
    {
      key: 'fillColor',
      accessor: 'getFillColor',
      pickingInfo: 'colorValue',
      getBins: {
        triggers: {
          value: {
            prop: 'getColorValue',
            updateTrigger: 'props.layerCfg'
          },
          weight: {
            prop: 'getColorWeight',
            updateTrigger: 'getColorWeight'
          },
          aggregation: {
            prop: 'colorAggregation'
          },
          filterData: {
            prop: '_filterData',
            updateTrigger: '_filterData'
          }
        }
      },
      getDomain: {
        triggers: {
          lowerPercentile: {
            prop: 'lowerPercentile'
          },
          upperPercentile: {
            prop: 'upperPercentile'
          },
          scaleType: {
            prop: 'colorScaleType'
          }
        }
      },
      getScaleFunc: {
        triggers: {
          domain: {prop: 'colorDomain'},
          range: {prop: 'colorRange'}
        },
        onSet: {
          props: 'onSetColorDomain'
        }
      },
      nullValue: [0, 0, 0, 0]
    },
    {
      key: 'elevation',
      accessor: 'getElevation',
      pickingInfo: 'elevationValue',
      getBins: {
        triggers: {
          value: {
            prop: 'getElevationValue',
            updateTrigger: 'getElevationValue'
          },
          weight: {
            prop: 'getElevationWeight',
            updateTrigger: 'getElevationWeight'
          },
          aggregation: {
            prop: 'elevationAggregation'
          },
          filterData: {
            prop: '_filterData',
            updateTrigger: '_filterData'
          }
        }
      },
      getDomain: {
        triggers: {
          lowerPercentile: {
            prop: 'elevationLowerPercentile'
          },
          upperPercentile: {
            prop: 'elevationUpperPercentile'
          },
          scaleType: {
            prop: 'elevationScaleType'
          }
        }
      },
      getScaleFunc: {
        triggers: {
          domain: {prop: 'elevationDomain'},
          range: {prop: 'elevationRange'}
        },
        onSet: {
          props: 'onSetElevationDomain'
        }
      },
      nullValue: -1
    }
  ];

export class LocalHexagonLayer extends HexagonLayer {

  initializeState() {
      super.initializeState();
      const modCpuAggregator = new ModCpuAggregator({
        getAggregator: props => props.hexagonAggregator,
        getCellSize: props => props.radius,
        clickedSectors: this.props.clickedSectors
      });
  
      this.state = {
        ...this.state,
        cpuAggregator: modCpuAggregator,
        aggregatorState: modCpuAggregator.state
      };
    }
  
    /*updateState(opts) {
      super.updateState(opts);
      const {cpuAggregator, hexagonVertices: oldVertices} = this.state;
  
      if (opts.changeFlags.propsOrDataChanged) {
        this.setState({
          // make a copy of the internal state of cpuAggregator for testing
          aggregatorState: cpuAggregator.updateState(opts, {
            viewport: this.context.viewport,
            attributes: this.getAttributes()
          })
        });
      }
    }*/
      
  getFillColorSortedBins(){
    if(this.state === null)
      return undefined;
    const { cpuAggregator } = this.state;
    return cpuAggregator.getFillColorSortedBins();
  }

}

class ModCpuAggregator extends CPUAggregator {

  constructor(props){
    super(props);
    this.setState({...this.state, clickedSectors: props.clickedSectors, currentBins: []});
  }

  needsReProjectPoints(oldProps, props, changeFlags) {
    if(changeFlags.stateChanged || (changeFlags.updateTriggersChanged !== undefined && changeFlags.updateTriggersChanged.getFillColor) || 
    super.needsReProjectPoints(oldProps, props, changeFlags)){
      this.setState({...this.state, currentBins: []});
      return true;
    }
    return false;
  }

  updateState(opts, aggregationParams) {
    const {oldProps, props, changeFlags} = opts;
    this.updateGetValueFuncs(oldProps, props, changeFlags);
    const reprojectNeeded = this.needsReProjectPoints(oldProps, props, changeFlags);
    let aggregationDirty = false;
    if (changeFlags.dataChanged || reprojectNeeded) {
      // project data into bin and aggregate wegiths per bin
      this.getAggregatedData(props, aggregationParams);
      aggregationDirty = true;
    } else {
      const dimensionChanges = this.getDimensionChanges(oldProps, props, changeFlags) || [];
      // this here is layer
      dimensionChanges.forEach(f => typeof f === 'function' && f());
      aggregationDirty = true;
    }
    this.setState({...this.state, aggregationDirty, clickedSectors: props.clickedSectors});

    return this.state;
  }

  getFillColorSortedBins(){
    return this.state.currentBins;
  }

  getSubLayerDimensionAttribute(key, nullValue) {
    return cell => {
      const { currentBins, clickedSectors } = this.state;      
      const {sortedBins, scaleFunc} = this.state.dimensions[key];
      const bin = sortedBins.binMap[cell.index];

      if (bin && bin.counts === 0) {
        // no points left in bin after filtering
        return nullValue;
      }
      const cv = bin && bin.value;
      const domain = scaleFunc.domain();

      const isValueInDomain = cv >= domain[0] && cv <= domain[domain.length - 1];

      let color = scaleFunc(cv);

      if(key === 'fillColor'){
        let inflatedCV = Math.ceil(Math.pow(Math.E, cv));
        if(currentBins[color] === undefined){
          currentBins[color] = {min: inflatedCV, max: inflatedCV, count: Math.pow(Math.E, sortedBins.binMap[cell.index].value)};
        }else
        {
          currentBins[color].min = Math.min(inflatedCV, currentBins[color].min);
          currentBins[color].max = Math.max(inflatedCV, currentBins[color].max);
          currentBins[color].count += Math.pow(Math.E, sortedBins.binMap[cell.index].value); 
        }
        
        let index = cell.position[0]+"-"+cell.position[1];

        if(clickedSectors[index] !== undefined)
          color = chroma('yellow').rgb();
          //color = chroma.blend(chroma(color), chroma.gl(255,255,0,0.2), 'lighten').rgb();
      
      }
      // if cell value is outside domain, set alpha to 0
        return isValueInDomain ? color : nullValue;
    };
  }
}