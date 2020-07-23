# Sabrina 2.0

Sabrina 2.0 is a follow-up version of Sabrina, software for the visualization of Financial Data presented at VIS 2019 ([arXiv](https://arxiv.org/pdf/1908.07479.pdf)).

## Installation

Once the repo has been checked out, get into the ```public -> csv -> models```. There, inflate the ```models.7z``` archive, so that the overall folder structure is ```public -> csv -> models -> <model folders>```.

Afterwards, install the project dependencies using the following, in the root folder:

```bash
npm install
```

## Usage

Once checked out, the system can be run using:

```bash
npm start
```

Otherwise, use the `npm build` to build the system to be loaded to a server. If so, please modify the ```package.json``` adding the ```Homepage``` attribute.

Please note that the system has been successfully tested on Chrome (ver. 83.0.4103.106) and reported working also on following versions (tested up to ver. 84.0.4147.89).

## Included Data
Included, a randomized and anonymized version of the data discussed in the paper. Included, also 8 families of models, with various sizes and available options.

## Live Demo
Can't wait? Check out the [live demo](http://graphdrawing.cloud/sabrinav2) of the system. N.B.: larger models might take a while to load.

## License
[GNU GPLv3](https://choosealicense.com/licenses/gpl-3.0/)