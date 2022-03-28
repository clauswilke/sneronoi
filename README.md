# Sneronoi

This repository contains the source code for the generative art collection Sneronoi, written by Claus O. Wilke and released on fx(hash) on Dec. 27, 2021: https://www.fxhash.xyz/generative/4832

The code is provided as is, with some very minor clean-up compared to the published version. Generated outputs are identical. The code is licensed under CC-BY, so it can be used for derivative NFT projects. One of the main features of the code is a 2D JavaScript implementation of t-SNE with relatively good performance.


# How to build and run the code locally

The Sneronoi code is derived from the fx(hash) webpack boilerplate (https://github.com/fxhash/fxhash-webpack-boilerplate). Installation and usage instructions are identical to the boilerplate and are reproduced here with minor change.

You will need to have [nodejs](https://nodejs.org/) installed.

## Installation

> First, make sure that your node version is >= 14

Clone the repository on your machine and move to the directory
```sh
$ git clone https://github.com/clauswilke/sneronoi.git your_folder && cd your_folder
```

Install the packages required for the local environment
```sh
$ npm i
```

## Start local environment

```sh
$ npm start
```

This last command will start a local http server with [live reloading](https://webpack.js.org/configuration/dev-server/#devserverlivereload) enabled. Open [http://localhost:8080](http://localhost:8080) to see the project in the browser.

## Build

```sh
$ npm run build
```

Will bundle the js dependencies into a single minified `bundle.js` file, move the files from the `public/` to the `dist/` folder, and link the `bundle.js` with the `index.html`. Moreover, it will create a `dist-zipped/project.zip` file which can be directly imported on fxhash.

# Frequently asked questions

## Can I really use this code for my own NFT projects?

Yes, you just have to acknowledge that you used my code. Something like the following in the description of your work would be appropriate: "Based on Sneronoi code by Claus O. Wilke, licensed under CC-BY."

## I don't want to reproduce your art. Is this even useful?

t-SNE is a very flexible algorithm and depending on input parameters and visualization choices can produce many different types of artworks. I think that if you try a bit, you can make it your own. As an example, check out the pieces on my website (https://clauswilke.com/art). Also, I'd like to point out that two other pieces I released on fx(hash), "Incomplete Convergence" and "Voxelsne", were also based on this code.

## I don't want to use t-SNE but I like your color palettes. Can I use them?

Yes! But you do have to acknowledge where you got them from. Something like the following in the description of your work would be appropriate: "Color palettes taken from Sneronoi project by Claus O. Wilke, licensed under CC-BY."