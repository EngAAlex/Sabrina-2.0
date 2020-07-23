import React, {Component} from 'react';
import { withStyles } from '@material-ui/core/styles';
import {Paper, Typography, Modal, Button} from "@material-ui/core";

function rand() {
  return Math.round(Math.random() * 20) - 10;
}

function getModalStyle() {
    const top = 50;// + rand();
    const left = 50;// + rand();
  
    return {
      top: `${top}%`,
      left: `${left}%`,
      transform: `translate(-${top}%, -${left}%)`,
    };
  }

const MODAL_STYLES =  {
    paper: {
        position: 'absolute',
        width: 400,
        backgroundColor: 'lightgrey',
        border: '2px solid #000',
        boxShadow: '3px',
        padding: '5px',
    },
    label: {
        fontSize: "17px",
        color: "black",
        fontWeight: "bold",
        marginBottom: '3px',
        width: '100%',
        textAlign: "center"
    },
    sectorHeading: {
        fontSize: "15px",
        color: "black",
        flexBasis: '30%',
        flexShrink: 0,
    },
};

class ModalMessage extends Component {

  render() {
    const {classes, open, onClose} = this.props;

    return(
        <div>
            <Modal 
                open={open}
                aria-labelledby="simple-modal-title"
                aria-describedby="simple-modal-description"
            >
                <Paper style={getModalStyle()} className={classes.paper}>
                    <Typography className={classes.label} id="welcome-title">Sabrina 2.0</Typography>
                    <Typography className={classes.sectorHeading} id="welcome-description">
                        Welcome to Sabrina 2.0!

                        Please note that the data presented has been randomized for public usage. Please refer to <a target="_blank" href="https://github.com/EngAAlex/Sabrina-2.0">this link</a> for more information!
                    </Typography>
                    <div style={{width: '100%', textAlign: 'center', marginTop: '3px'}}>
                        <Button onClick={() => onClose()}variant="contained" color="primary">
                            Close
                        </Button>
                    </div>
                </Paper>
            </Modal>
        </div>
    );
  }
}

const WelcomeDialog = withStyles(MODAL_STYLES)(ModalMessage);
export {WelcomeDialog};