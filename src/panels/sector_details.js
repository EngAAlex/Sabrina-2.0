import React from "react";

import { ContinuousColorLegend } from 'react-vis'
import {withStyles} from "@material-ui/core/styles";
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
		 TableRow, TableSortLabel, /*Switch,*/ ExpansionPanel, ExpansionPanelSummary,
		 ExpansionPanelDetails, Button } from "@material-ui/core";
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { XAxis, FlexibleWidthXYPlot ,/* YAxis,*/ VerticalRectSeries } from "react-vis";
import Floater from 'react-floater';
import chroma from 'chroma-js';
import { faBullseye } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'


import { greenScaleMin, redScaleMin, greenScaleMax, redScaleMax, makeid, getSuffixString, firmSizeBounds } from "./utils";
//import { CtLayerCfg } from "../ct-layers";

const rowsPerPageGlobal = 15;

const firmsChromaScale = [
	"#fc8d59",
	"#ffffbf",
	"#91bfdb"
];

const TABLE_STYLE = {
    root: {
        width: '100%',
      },
      paper: {
        width: '100%',        
      },
      table: {
        width: '100%',
      },
      visuallyHidden: {
        border: 0,
        clip: 'rect(0 0 0 0)',
        height: 1,
        margin: -1,
        overflow: 'hidden',
        padding: 0,
        position: 'absolute',
        top: 20,
        width: 1,
	  },
	  heading: {
        textAlign: "center",
        fontWeight: "bold",
        fontSize: "small",
	  },
	  icon: {
		  marginLeft: "3px"
	  }
    };

const EXP_PANEL_STYLES = {
    table_heading: {
		textAlign: "center",
		fontWeight: "bold",
		fontSize: "small"		
    },
    generalInfo: {
        textAlign: 'left',
		display: 'block',
		padding: "0px 6px",
        /*opacity: "0.85",
        position: "absolute",
		bottom: "50px",*/
		width: '99%',
		zIndex: 8,
        borderTop: "solid #212121 4px"		
	},
	transactionsInfo: {
		width: '99%',
		display: 'block',
		borderTop: "solid #212121 4px"		
	},
    text: {
        fontSize: "15px",
        color: "#2196f3",
        fontFamily: "Monospace",
	},
    heading_withmargin: {
        margin:"15px 0px 0px 0px",
    },
    legendBox: {
        textAlign: 'left',
        display: 'block',
        opacity: "0.85",
        position: "absolute",
        bottom: "47px",
		zIndex: 8,
		left: "260px"		
	},
	boundsText: {
		fontSize: "14px",
		fontWeight: "bold",
		position: "relative",
		bottom: "4px"
	}
	
}

function descendingComparator(a, b, orderBy) {
	if (b[orderBy] < a[orderBy]) {
	  return -1;
	}
	if (b[orderBy] > a[orderBy]) {
	  return 1;
	}
	return 0;
  }
  
  function getComparator(order, orderBy) {
	return order === 'desc'
	  ? (a, b) => descendingComparator(a, b, orderBy)
	  : (a, b) => -descendingComparator(a, b, orderBy);
  }
  
  function stableSort(array, comparator) {
	const stabilizedThis = array.map((el, index) => [el, index]);
	stabilizedThis.sort((a, b) => {
	  const order = comparator(a[0], b[0]);
	  if (order !== 0) return order;
	  return a[1] - b[1];
	});
	return stabilizedThis.map(el => el[0]);
  }

  const transactionsHeadCells = [
	{ id: 'fromId', numeric: false, disablePadding: true, label: 'Source' },
	{ id: 'fromSector', numeric: false, disablePadding: true, label: 'Sector' },
	{ id: 'toId', numeric: true, disablePadding: false, label: 'Target' },
	{ id: 'toSector', numeric: false, disablePadding: true, label: 'Sector' },
	{ id: 'amount', numeric: true, disablePadding: false, label: 'Amount' },
	{ id: 'model_name', numeric: false, disablePadding: false, label: 'Model' },
  ];

  const bundledTransactionHeadCells = [
	{ id: 'bundleSize', numeric: false, disablePadding: true, label: 'Bundle Size' },
	{ id: 'amount', numeric: true, disablePadding: false, label: 'Total Amount' },
	{ id: 'top_senders', numeric: true, disablePadding: false, label: 'Top Senders (>10%)' },
	{ id: 'top_receiv', numeric: true, disablePadding: false, label: 'Top Receivers (>10%)' },
	//{ id: 'no_models', numeric: false, disablePadding: false, label: 'Incl. Models' },
  ];

class FirmsTable extends React.Component{
	
	constructor(props){
		super(props);
		const {layerCfg} = this.props;
        let optsStore = layerCfg.firms_table;		
		this.state = {
				order: optsStore === undefined || optsStore.order === undefined ? 'asc' : optsStore.order, 
				orderBy: optsStore === undefined || optsStore.orderBy === undefined ? 'Firm_ID' : optsStore.orderBy, 
				page: optsStore === undefined || optsStore.page === undefined ? 0 : optsStore.page, 
				rowsPerPage: rowsPerPageGlobal}
	}

	_handleChangePage = (event, newPage) => {
        const { layerCfg, onLayerCfgStateChanged } = this.props;
		this.setState({...this.state, page: newPage}, () => {
			onLayerCfgStateChanged({...layerCfg, firms_table: {...layerCfg.firms_table, page: newPage}});
		});
	};

	_handleRequestSort = (event, property) => {
		const {orderBy, order} = this.state;
        const { layerCfg, onLayerCfgStateChanged } = this.props;

		const isAsc = orderBy === property && order === 'asc';
		this.setState({...this.state, order: isAsc ? 'desc' : 'asc', orderBy: property}, () => {
			onLayerCfgStateChanged({...layerCfg, firms_table: {...layerCfg.firms_table, order: isAsc ? 'desc' : 'asc', orderBy: property}});
		});		
		
  	};

	_getEmptyRows = (length) => {
		const {rowsPerPage, page} = this.state;
		return rowsPerPage - Math.min(rowsPerPage, length - page * rowsPerPage);

	}

	_getHeadCells = () => {
		const {selectedStrategy} = this.props;
		return [
			{ id: 'id', numeric: false, disablePadding: true, label: 'Id and Name' },			
			{ id: 'edv_e1', numeric: false, centered: true, disablePadding: true, label: 'Sector' },
			{ id: 'avg_finanzen', numeric: true, floater: true, disablePadding: false, label: 'Avg. Cashflow'},
			{ id: 'employees', numeric: true, disablePadding: false, label: 'Employees'},
			{ id: 'contribution_value', numeric: true, disablePadding: false, label: selectedStrategy.getHeader },
		  ];
	}

	render(){
		const { order, orderBy, page, rowsPerPage } = this.state;
		const { classes, clickedSectors, selectedStrategy, layerCfg, localFirms, displayedFirms } = this.props;
		
		const createSortHandler = property => event => {
			this._handleRequestSort(event, property);
		  };	

		let selectedFirms = [];

		for(let i in clickedSectors)
		  if(clickedSectors[i] !== undefined)
			selectedFirms = selectedFirms.concat(clickedSectors[i]);
		  
		if(selectedFirms.length === 0) 
			return (<Typography className={classes.smallText}>No Firms to Display</Typography>);


		let emptyRows = this._getEmptyRows(selectedFirms.length);

		let sizeColorScale = chroma.scale(firmsChromaScale).domain(firmSizeBounds, 3, 'q');
		let ch_data = firmSizeBounds.map((curr, ind) => {
			return {x0: 30*(ind), x: 30*(ind+1), y0: 0, y:30, val: curr, color: firmsChromaScale[ind]};
		});
		ch_data.push(
			{x0: 0, x: 15, y0: 0, y:30, color: firmsChromaScale[0]}
		);
		ch_data.push(
			{x0: 30, x: 45, y0: 0, y:30, color: firmsChromaScale[1]}
		);
		ch_data.push(
			{x0: 60, x: 75, y0: 0, y:30, color: firmsChromaScale[2]}
		);

		let ticks = ch_data.map((d) => d.x);
		let flexiblePlot = (
			<div>
				<Typography className={classes.heading}>Firm Size Color Coding</Typography>
				<FlexibleWidthXYPlot
					getX={d => d.x}
					getY={d => d.y}
					margin={{ left: 10, right: 10, top: 0, bottom: 25 }}
					height={60}
					yDomain={[0, 100]}
					xDomain={[0, 90]}
				>
					<VerticalRectSeries
					colorType="literal"
					data={ch_data}
					style={{ cursor: 'pointer' }}
					/>
					<XAxis
					style={{
						ticks: {stroke: '#ADDDE1'},
						text: {stroke: 'none', fill: '#6b6b76', fontWeight: 'bold', fontSize: '12px'}}}
					tickFormat={curr => {
						let label = "";
						if(curr === 15)
							label = "Small";
						else if(curr === 45)
							label ="Medium";
						else if(curr === 75)
							label = "Large";  							
						return label;
						}
					}
					tickValues={ticks}
					/>
				</FlexibleWidthXYPlot>
			</div>
		)
		return(
				<div className={classes.root} key={makeid(7)}>
					<TableContainer>
						<Table
							className={classes.table}
							aria-labelledby="firmsInSector"
							size="small"
							aria-label="firmsInSector"
						>
							<TableHead>
								<TableRow>
									{this._getHeadCells().map(headCell => (
									<TableCell
										key={headCell.id}
										align={headCell.numeric ? 'right' : 'center'}
										padding={headCell.disablePadding ? 'none' : 'default'}
										sortDirection={orderBy === headCell.id ? order : false}
									>
										<TableSortLabel
										active={orderBy === headCell.id}
										direction={orderBy === headCell.id ? order : 'asc'}
										onClick={createSortHandler(headCell.id)}
										>
										{headCell.floater ? 
											(
											<Floater key={makeid(5)} event="hover" content={flexiblePlot}>
											<span style={{float: 'right'}}><FontAwesomeIcon className={classes.icon} icon={faQuestionCircle}></FontAwesomeIcon></span>
											</Floater>
											)
										: ""}
										{headCell.label}
										{orderBy === headCell.id ? (
											<span className={classes.visuallyHidden}>
											{order === 'desc' ? 'sorted descending' : 'sorted ascending'}
											</span>
										) : null}
										</TableSortLabel>
									</TableCell>
									))}
								</TableRow>
							</TableHead>
							<TableBody>
								{stableSort(selectedFirms, getComparator(order, orderBy))
								.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
								.map((row, index) => {
									const labelId = `firms-table-${index}`;
									let colorValue = getSuffixString(selectedStrategy.getColorValue([row], layerCfg, localFirms, displayedFirms));
									//let valueString = colorValue; 
									let avgFinanzen = row.avg_finanzen;
									let avgFinanzenString = getSuffixString(avgFinanzen);
									let employees = row.employees;
									let emplString = getSuffixString(employees);
									row.contribution_value = colorValue;
									return (
										<TableRow
											tabIndex={-1}
											key={makeid(4) + "-" + row.firm_id}
											hover={true}
										>
											<TableCell component="th" id={labelId} scope="row" padding="none">
											{row.firm_id}<Floater key={makeid(5)} event="click" content={
												<Typography className={classes.heading}>{row.name}</Typography>
												}>
											<span><FontAwesomeIcon className={classes.icon} icon={faQuestionCircle}></FontAwesomeIcon></span>
											</Floater>
											</TableCell>
											<TableCell align="center">{row.edv_e1}</TableCell>
											<TableCell style={{backgroundColor: sizeColorScale(avgFinanzen).hex()}} align="right">{avgFinanzenString[0]+avgFinanzenString[1]}</TableCell>
											<TableCell style={{backgroundColor: sizeColorScale(avgFinanzen).hex()}} align="right">{emplString[0]+emplString[1]}</TableCell>
											<TableCell align="right">{colorValue[0]+colorValue[1]}</TableCell>
										</TableRow>
										);
									})}
								{emptyRows > 0 && (
								<TableRow style={{ height: 33 * emptyRows }}>
									<TableCell colSpan={6} />
								</TableRow>
								)}
							</TableBody>
							</Table>
						</TableContainer>
					<TablePagination
						rowsPerPageOptions={[rowsPerPage]}
						component="div"
						count={selectedFirms.length}
						rowsPerPage={rowsPerPage}
						page={page}
						onChangePage={this._handleChangePage}
					/>
				</div>
		);
	}

};

class TransactionsTable extends React.Component{
	
	constructor(props){
		super(props);
		const {layerCfg} = this.props;
        let optsStore = layerCfg.transaction_table;		
		this.state = {
				order: optsStore === undefined || optsStore.order === undefined ? 'asc' : optsStore.order, 
				orderBy: optsStore === undefined || optsStore.orderBy === undefined ? 'fromId' : optsStore.orderBy, 
				page: optsStore === undefined || optsStore.page === undefined ? 0 : optsStore.page, 
				rowsPerPage: rowsPerPageGlobal}	}

	_handleChangePage = (event, newPage) => {
        const { layerCfg, onLayerCfgStateChanged } = this.props;
		this.setState({...this.state, page: newPage}, () => {
			onLayerCfgStateChanged({...layerCfg, transaction_table: {...layerCfg.transaction_table, page: newPage}})
		});	};

	_handleRequestSort = (event, property) => {
        const { layerCfg, onLayerCfgStateChanged } = this.props;
		const {orderBy, order} = this.state;
		const isAsc = orderBy === property && order === 'asc';
		this.setState({...this.state, order: isAsc ? 'desc' : 'asc', orderBy: property}, () => {
			onLayerCfgStateChanged({...layerCfg, transaction_table: {...layerCfg.transaction_table, order: isAsc ? 'desc' : 'asc', orderBy: property}});
		});		
  	};

	_getEmptyRows = (length) => {
		const {rowsPerPage, page} = this.state;
		return rowsPerPage - Math.min(rowsPerPage, length - page * rowsPerPage);

	}

	render(){
		const { order, orderBy, page, rowsPerPage } = this.state;
		const { classes, transactions, bundledEdges } = this.props;
		
		if(transactions === null || transactions === undefined || transactions.length === 0 || transactions.length === 0) 
			return (<Typography className={classes.smallText}>No Transactions to display</Typography>);

		const createSortHandler = property => event => {
			this._handleRequestSort(event, property);
		  };	

		let emptyRows = this._getEmptyRows(transactions.length);

		return(
				<div className={classes.root} key={makeid(7)}>
					<TableContainer>
						<Table
							className={classes.table}
							aria-labelledby="transactionsInSector"
							size="small"
							aria-label="transactionsInSector"
						>
							<TableHead>
								<TableRow>
									{(bundledEdges ? bundledTransactionHeadCells : transactionsHeadCells).map(headCell => (
									<TableCell
										key={headCell.id}
										align={headCell.numeric ? 'right' : 'left'}
										padding={headCell.disablePadding ? 'none' : 'default'}
										sortDirection={orderBy === headCell.id ? order : false}
									>
										<TableSortLabel
										active={orderBy === headCell.id}
										direction={orderBy === headCell.id ? order : 'asc'}
										onClick={createSortHandler(headCell.id)}
										>
										{headCell.label}
										{orderBy === headCell.id ? (
											<span className={classes.visuallyHidden}>
											{order === 'desc' ? 'sorted descending' : 'sorted ascending'}
											</span>
										) : null}
										</TableSortLabel>
									</TableCell>
									))}
								</TableRow>
							</TableHead>
							<TableBody>
								{stableSort(transactions, getComparator(order, orderBy))
								.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
								.map((row, index) => {
									const labelId = `transactions-table-${index}`;
									return (
											bundledEdges ? this._getBundledTrnsactionTableRow(row, labelId, classes) : this._getTransactionTableRow(row, labelId, classes) 
										);
									})}
								{emptyRows > 0 && (
								<TableRow style={{ height: 33 * emptyRows }}>
									<TableCell colSpan={6} />
								</TableRow>
								)}
							</TableBody>
							</Table>
						</TableContainer>
					<TablePagination
						rowsPerPageOptions={[rowsPerPage]}
						component="div"
						count={transactions.length}
						rowsPerPage={rowsPerPage}
						page={page}
						onChangePage={this._handleChangePage}
					/>
				</div>
		);
	}

	_getTransactionTableRow = (row, labelId, classes) => {
		const {updateSelectedTransactions} = this.props;
		let valueString = getSuffixString(row.amount);

		if(row.aggregateData !== undefined)
			return (
				<TableRow>
					<TableCell></TableCell>
					<TableCell></TableCell>
					<TableCell></TableCell>
					<TableCell></TableCell>
					<TableCell></TableCell>
					<TableCell></TableCell>
				</TableRow>);

		//row.fromId = parseInt(row.from.firmId);
		//row.fromSector = localFirms.get(parseInt(row.from.firmId)).edv_e1;
		//row.fromName = localFirms.get(parseInt(row.from.firmId)).name
		//row.toId = parseInt(row.to.firmId);
		//row.toSector = localFirms.get(parseInt(row.to.firmId)).edv_e1;
		//row.toName = localFirms.get(parseInt(row.to.firmId)).name


		let bullseye = (
			<Floater key={makeid(5)} event="click" content={"Same Sector Transaction - Not displayed on map"}>
				<span style={{float: 'left', marginRight: "5px"}}><FontAwesomeIcon className={classes.icon} icon={faBullseye}></FontAwesomeIcon></span>
			</Floater>
		);

		return (
				<TableRow 
				tabIndex={-1}
				key={makeid(4)+"-"+row.from.firmId+"_"+row.to.firmId+"_"+row.model_idx}
				hover={true}
				edgeid={row.edgeId}
				onMouseEnter={(e) => 
					updateSelectedTransactions(e.currentTarget.attributes.edgeid.value)
				}
				onMouseLeave={(e) => 
					updateSelectedTransactions(undefined)
				}
			>
				<TableCell component="th" id={labelId} scope="row" padding="none">
				{row.fromId}<Floater key={makeid(7)} event="click" content={
												<Typography className={classes.heading}>{row.fromName}</Typography>
												}>
											<span><FontAwesomeIcon className={classes.icon} icon={faQuestionCircle}></FontAwesomeIcon></span>
							</Floater>
				</TableCell>
				<TableCell align="right">{row.fromSector}</TableCell>
				<TableCell component="th" id={labelId} scope="row" padding="none">
				{row.toId}
						    <Floater key={makeid(7)} event="click" content={
												<Typography className={classes.heading}>{row.toName}</Typography>
												}>
											<span><FontAwesomeIcon className={classes.icon} icon={faQuestionCircle}></FontAwesomeIcon></span>
							</Floater>
				</TableCell>
				<TableCell align="right">{row.toSector}</TableCell>
											<TableCell style={{backgroundColor: row.internal ? "transparent" : row.signed_amount > 0 ? greenScaleMin : redScaleMin}} align="right">{row.internal ? bullseye : ""}{valueString[0]+valueString[1]}</TableCell>
				<TableCell align="right">{row.model_name}</TableCell>
			</TableRow>
		);
	}

	_getBundledTrnsactionTableRow = (row, labelId) => {
		const {classes, updateSelectedTransactions} = this.props;
		let aggregateData = row.aggregateData;
		if(aggregateData === undefined)
			return (
				<TableRow>
					<TableCell></TableCell>
					<TableCell></TableCell>
					<TableCell></TableCell>
					<TableCell></TableCell>
				</TableRow>);
				
		let valueString = getSuffixString(aggregateData.amount);
		
		let bullseye = (
			<Floater key={makeid(5)} event="click" content={"Same Sector Transaction - Not displayed on map"}>
				<span style={{float: 'left', marginRight: "5px"}}><FontAwesomeIcon className={classes.icon} icon={faBullseye}></FontAwesomeIcon></span>
			</Floater>
		);

		return (
				<TableRow 
				tabIndex={-1}
				key={makeid(4)+"-"+row.from.firmId+"_"+row.to.firmId+"_"+row.model_idx}
				hover={true}
				edgeid={row.edgeId}
				onMouseEnter={(e) => 
					updateSelectedTransactions(e.currentTarget.attributes.edgeid.value)
				}
				onMouseLeave={(e) => 
					updateSelectedTransactions(undefined)
				}
			>
				<TableCell component="th" id={labelId} scope="row" padding="none">
					{row.bundleSize}
				</TableCell>
				<TableCell style={{backgroundColor: row.internal ? "transparent" : aggregateData.signed_amount > 0 ? greenScaleMin : redScaleMin}} align="right">{row.internal ? bullseye : ""}{valueString[0]+valueString[1]}</TableCell>
				<TableCell align="right">{row.top_senders}</TableCell>
				<TableCell align="right">{row.top_receiv}</TableCell>
			</TableRow>
		);
	}

};

class ClickedSectorDetailsAnalyticsPanel extends React.Component{

	render() {

		const { layerCfg, displayedFirms, onLayerCfgStateChanged, localFirms, clickedSectors, /*state, */ classes, selectedStrategy, transactions, updateSelectedTransactions } = this.props;	
		
		let firmsTable = clickedSectors === undefined || Object.entries(clickedSectors).length === 0 ? 
			(<Typography className={classes.smallText}>No Firms to Display</Typography>) :
			(<StyledFirmsTable 
				clickedSectors={clickedSectors}
				localFirms={localFirms}
				selectedStrategy={selectedStrategy}
				layerCfg={layerCfg}
				onLayerCfgStateChanged={onLayerCfgStateChanged}
				displayedFirms={displayedFirms}
				/>					
			);

		let transactionsTable = transactions === null || transactions === undefined || transactions.length === 0 ? 
			(<Typography className={classes.smallText}>No Transactions to display</Typography>) :
			(<StyledTransactionsTable 
				transactions={transactions}
				localFirms={localFirms}
				updateSelectedTransactions={(e) => updateSelectedTransactions(e)}
				layerCfg={layerCfg}
				onLayerCfgStateChanged={onLayerCfgStateChanged}		
				bundledEdges={layerCfg.bundleEdges}		
				/>
			);
				
		return [
				(<div className={classes.generalInfo} key={makeid(7)}>	
					<Typography className={classes.table_heading}>Firms In Sector</Typography>						
					{firmsTable}
				</div>),
				(<div className={classes.generalInfo} key={makeid(7)}>	
					<Typography className={classes.table_heading}>Loaded Transactions</Typography>
					{transactionsTable}		
				</div>)
				];
	};
}

class ClickedSectorDetailsBox extends React.Component{

	_getQuickStats = (transactions, filteredArcs, internalMovements) => {
		const { classes } = this.props;	
		const {data, maxFlow, minFlow, inFlow, outFlow, internalFlow, totalFlowAbs} = transactions;

		let maxFlowArr, minFlowArr, intArr, totalArr = getSuffixString(totalFlowAbs), inFlowArr = getSuffixString(inFlow), outFlowArr = getSuffixString(outFlow);		

		switch(transactions.unbundled !== undefined){
			case true: 
				maxFlowArr = getSuffixString(maxFlow);
				let maxFlowArrBund = getSuffixString(transactions.unbundled.maxFlow);

				minFlowArr = getSuffixString(minFlow);
				let minFlowArrBund = getSuffixString(transactions.unbundled.minFlow);

				intArr = getSuffixString(internalFlow);

				totalArr = getSuffixString(totalFlowAbs);			
					return(
						<div>
							<Typography className={classes.text}>Shown: {data.length} bundles ({transactions.unbundled.data.length} transactions)</Typography>							
							<Typography className={classes.text}>Max: {maxFlowArr[0]+maxFlowArr[1]} ({maxFlowArrBund[0]+maxFlowArrBund[1]})</Typography>
							<Typography className={classes.text}>Min: {minFlowArr[0]+minFlowArr[1]} ({minFlowArrBund[0]+minFlowArrBund[1]})</Typography>
							<Typography className={classes.text}>Incoming: {inFlowArr[0]+inFlowArr[1]}</Typography>
							<Typography className={classes.text}>Internal Flow: {intArr[0]+intArr[1]}</Typography>																		
							<Typography className={classes.text}>Outgoing: {outFlowArr[0]+outFlowArr[1]}</Typography>
							<Typography className={classes.text}>Totalflow: {totalArr[0]+totalArr[1]}</Typography>					
						</div>
					);
			default: 
				maxFlowArr = getSuffixString(maxFlow);
				minFlowArr = getSuffixString(minFlow);
				intArr = getSuffixString(internalFlow);
				totalArr = getSuffixString(totalFlowAbs);
				return (
					<div>
						<Typography className={classes.text}>Shown: {data.length}</Typography>
						<Typography className={classes.text}>Max: {maxFlowArr[0]+maxFlowArr[1]}</Typography>
						<Typography className={classes.text}>Min: {minFlowArr[0]+minFlowArr[1]}</Typography>
						<Typography className={classes.text}>Incoming: {inFlowArr[0]+inFlowArr[1]}</Typography>
						<Typography className={classes.text}>Internal Flow: {intArr[0]+intArr[1]}</Typography>																		
						<Typography className={classes.text}>Outgoing: {outFlowArr[0]+outFlowArr[1]}</Typography>									
						<Typography className={classes.text}>Totalflow: {totalArr[0]+totalArr[1]}</Typography>
					</div>
				);
		}
		
	}

	render() {

		const { classes, colorLegend, transactions, clearSelection, selectedCount } = this.props;	

		let suffixStringMin, suffixStringMax, legends = ("");		

		let panelDetails = ("");

		if((transactions !== undefined || transactions.length > 0) && colorLegend !== undefined && colorLegend.length > 0){
			suffixStringMin = getSuffixString(colorLegend[0]);
			suffixStringMax = getSuffixString(colorLegend[1]);
			legends = 
				(<div>					
					<ContinuousColorLegend className={classes.timelineGuidanceScale} key={makeid(5)}
						width={"100%"}
						height={8}
						startColor={redScaleMin}
						endColor={redScaleMax} 
						startTitle={<Typography className={classes.boundsText}>{suffixStringMin[0] + suffixStringMin[1]}</Typography>}
						endTitle={<Typography className={classes.boundsText}>{suffixStringMax[0] + suffixStringMax[1]}</Typography>}  							      
					/>  	
					<ContinuousColorLegend className={classes.timelineGuidanceScale} key={makeid(5)}
						width={"100%"}
						height={8}
						startColor={greenScaleMin}
						endColor={greenScaleMax} 
						startTitle={""}
						endTitle={""}             
					/> 
				</div>
			);

			panelDetails = (<div>
								<div className={classes.generalInfo} key={makeid(7)}>
									<Typography style={{marginBottom: "13px",}} className={classes.table_heading}>General Statistics</Typography>
									{this._getQuickStats(transactions)}
								</div>
								<div className={classes.generalInfo} key={makeid(7)}>
									<Typography style={{marginBottom: "20px",}} className={classes.table_heading}>Transaction Legend (€)</Typography>
									{legends}
								</div>
							</div>
							);
		}
		//if(Object.entries(clickedFirms).length > 0)
			return (
				<div className={classes.legendBox}>
				<ExpansionPanel>
					<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
			<Typography className={classes.heading}>{selectedCount} Selected Sectors</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails style={{display: 'block'}}>
						<Button style={{width: '100%'}} onClick={(e) => clearSelection()}>Clear Selection</Button>
						{panelDetails}							
					</ExpansionPanelDetails>
				</ExpansionPanel>
				</div> );
		/*}else
			return ("");*/
		
	};
}

const DetailsPanelBox = withStyles(EXP_PANEL_STYLES)(ClickedSectorDetailsBox);
const DetailsPanel = withStyles(EXP_PANEL_STYLES)(ClickedSectorDetailsAnalyticsPanel);
const StyledFirmsTable = withStyles(TABLE_STYLE)(FirmsTable);
const StyledTransactionsTable = withStyles(TABLE_STYLE)(TransactionsTable);

export {DetailsPanel, DetailsPanelBox, StyledFirmsTable, StyledTransactionsTable}