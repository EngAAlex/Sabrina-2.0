export const greenScaleMin = '#a1d76a';
export const greenScaleMax = '#4d9221';
export const redScaleMin = '#e7d4e8';
export const redScaleMax = '#762a83';
export const greenScaleDomain = [greenScaleMin,greenScaleMax];
export const redScaleDomain = [redScaleMin,redScaleMax];

export const COMMON_SWITCH_STYLES = {
	timelineSwitch: {
		padding: "0px 5px",
		margin: "0px 0px",
	},
	timelineSwitchBase: {
		'&$timelineChecked': {
			color: "#2196f3",
			'& + $timelineBar': {
				backgroundColor: "#2196f3",
			},
		},
	},
	timelineBar: {},
	timelineChecked: {},
};

/*const LIGHT_SETTINGS = {
		lightsPosition: [9, 46, 30000, 18, 49, 30000],
		ambientRatio: 0.3,
		diffuseRatio: 0.8,
		specularRatio: 0.2,
		lightsStrength: [0.8, 0.8, 0.8, 0.8],
		numberOfLights: 2
};*/

export const firmSizeBounds = [
	2000000,
	10000000,
	50000000
];

/*const ARC_COLORS = [
	[255, 255, 178],
	[254, 217, 118],
	[254, 178, 76],
	[253, 141, 60],
	[252, 78, 42],
	[227, 26, 28],
	[177, 0, 38]
	];*/

export function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

 export function getSuffixString(value){
	let suffix = [value, ""];
	if (suffix >= 10**12) {
		suffix[0] = (value /(10**12)).toFixed(2);
		suffix[1] = "Tn";
	} else if (value >= 10**9) {
		suffix[0] = (value / (10**9)).toFixed(2);
		suffix[1] = "Bn";
	} else if (value >= 10**6) {
		suffix[0] = (value / (10**6)).toFixed(2);
		suffix[1] = "M";
	} else if (value >= 10**3) {
		suffix[0] = (value / (10**3)).toFixed(2);
		suffix[1] = "K";
	}

	return suffix;
}

export function parseTimeline(currDate) {
	let year = Math.floor(currDate);
	let frac = currDate - year;
	//let year_max = year;
	let s;
	if (frac > 0.25) {
		year++;// = year_max + 1;
		s = frac - 0.25;
	} else if (frac < 0.25) {
		s = frac + 0.75;
	} else {
		s = 0;
	}
	return {
		year: year,
		s: s,
	}
}

export function colorObjectsMatch(arr1, arr2) {

	if(arr1 === arr2 || (arr1 === undefined && arr2 === undefined))
		return true;

	if((arr1 === null || arr2 === null) ||
				(arr1 === undefined || arr2 === undefined))
				return false;

	// Check if the arrays are the same length
	if (Object.entries(arr1).length !== Object.entries(arr2).length) 
		return false;

	// Check if all items exist and are in the same order
	for (let i in arr1) {
		if(arr2[i] === undefined || !isEquivalent(arr1[i], arr2[i])) return false;
	}
	/*for (let i in arr2) {
		if(arr1[i] === undefined || !isEquivalent(arr1[i], arr2[i])) return false;
	}*/

	// Otherwise, return true
	return true;
};

function isEquivalent(a, b) {
    // Create arrays of property names
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length !== bProps.length) {
        return false;
    }

    for (var i = 0; i < aProps.length; i++) {
        var propName = aProps[i];

        // If values of same property are not equal,
        // objects are not equivalent
        if (a[propName] !== b[propName]) {
            return false;
        }
    }

    // If we made it this far, objects
    // are considered equivalent
    return true;
}


export function getRadiusInPixel(radius, viewport, center) {
	const {unitsPerMeter} = viewport.getDistanceScales(center);
	// x, y distance should be the same
	return radius * unitsPerMeter[0];
};

export function extractPosition (element){
	return [element.longitude, element.latitude];
};

/**
 * Get the bounding box of all data points
 */
export function getPointsCenter(data, aggregationParams) {
	const {attributes} = aggregationParams;
	const positions = attributes.positions.value;
	const {size} = attributes.positions.getAccessor();
  
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let i;
  
	for (i = 0; i < size * data.length; i += size) {
	  const x = positions[i];
	  const y = positions[i + 1];
	  const arrayIsFinite = Number.isFinite(x) && Number.isFinite(y);
  
	  if (arrayIsFinite) {
		minX = Math.min(x, minX);
		maxX = Math.max(x, maxX);
		minY = Math.min(y, minY);
		maxY = Math.max(y, maxY);
	  }
	}
  
	// return center
	return [minX, minY, maxX, maxY].every(Number.isFinite)
	  ? [(minX + maxX) / 2, (minY + maxY) / 2]
	  : null;
  }