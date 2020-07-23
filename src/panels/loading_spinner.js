import React from 'react';

import {withStyles} from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";

const LOADER_CLASSES = {
    modal: {
        position: 'absolute',
        left: "0",
        top: "0",
        width: "1500px",
        height: "1500px",
        backgroundColor: "rgba(0, 0, 0, 0.6)"
    },
    container:{
        backgroundColor: "white",
        borderRadius: "12px",
        position: 'absolute',
        left: '50%',
        top: '50%',
        zIndex: 10,
        width: '500px',
        height: '220px',
        margin: '-110px 0 0 -250px',
    },
    loader: {
        position: 'absolute',
        top: '5px',
        zIndex: 10,
        width: '150px',
        height: '150px',
        margin: '0px 0 0 159px',
        border: '16px solid #f3f3f3',
        borderRadius: '50%',
        borderTop: '16px solid #3498db',
        animation: '$spinAnimation 3s linear infinite',
    },
    '@keyframes spinAnimation': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' },
    },
    loaderLabel: {
        bottom: '3%',
        textAlign: 'center',
        //left: '50%',
        width: '100%',//'150px',
        //height: '150px',
        margin: '-75px 0 0 0',
        zIndex: '10',
        position: 'absolute',
        color: 'black'
    },
};

class LoadingSpinner extends React.Component{

    render(){
        const {active, loading_label, classes} = this.props;
        if(!active)
            return (<div style={{display: "none"}}></div>);
        return (
            <div>
                <div className={classes.container}>
                    <div className={classes.loader}></div>
                    <Typography className={classes.loaderLabel}>{loading_label}</Typography>                    
                </div>                
            </div>
        );
    }

}

const LoadingAnimation = withStyles(LOADER_CLASSES)(LoadingSpinner);
export {LoadingAnimation};