/**
 * Sneronoi.js - JavaScript bundle to produce generative art
 * 
 * Copyright (c) 2021, Claus O. Wilke
 * All rights reserved.
 * 
 * This code is released under CC-BY 4.0:
 * https://creativecommons.org/licenses/by/4.0/
 * 
 * Some code in this bundle was written by third parties
 * and is distributed under their respective licensing
 * conditions:
 * - D3 (ISC License, https://github.com/d3/d3/blob/main/LICENSE)
 * - chroma.js (BSD License, https://github.com/gka/chroma.js/blob/master/LICENSE)
 * @preserve
 **/
const d3 = require('d3')
const chroma = require('./chroma.js')
const FXRandom = require('./fxrandom.js')
const Point = require('./point.js')
const TSNE = require('./tsne.js')
const ColorPalettes = require('./color_palettes.js')

// Uncomment the following line to render the output for a specific hash
//fxhash = 'oo3rpgah1QVGe8mgixJsj5oYwjmBULNf6oD11FW3JSQjhZguTjH'
console.log('Hash:', fxhash)   // the 64 chars hex number fed to your algorithm
let rnd = new FXRandom(fxhash, true)

// limit n*groups to 2000 for reasonable performance and results
// stripes choices:
// - groups from 50 to 100
// - n from 5 to 15
// - perplexities: 3, 5, 10, 20
// - noise 0, 0.01, 0.1, 0.2

// spiral choices
// - groups from 50 to 100
// - n = 1000, 1500, 2000 / groups
// - perplexities: 5, 10, 20, 30
// - noise 0, 0.001, 0.01, 0.02
let groups = 50
let n = Math.floor(2000/groups)
let perplexity = 10
let max_iter = 500 // has to be at least 200
let sd = 0.01
let b = 1
let tsne_input

let type = rnd.chooseOneWeighted(['spirals', 'stripes'], [5, 3])

if (type === 'spirals') {
  groups = Math.floor(rnd.rUnif(50, 101))
  n = Math.floor(rnd.chooseOne([1400, 1600, 1800, 2000, 2200]) / groups)
  perplexity = rnd.chooseOne([5, 10, 20, 30])
  sd = rnd.chooseOne([0, 0.001, 0.002, 0.003, 0.004, 0.01, 0.02])
  tsne_input = setupPointsSpiral(groups, n, sd)
} else {
  groups = Math.floor(rnd.rUnif(50, 101))
  n = Math.floor(rnd.rUnif(5, 16))
  perplexity = rnd.chooseOne([3, 5, 10, 20])
  sd = rnd.chooseOne([0.02, 0.1, 0.2, 0.4])
  tsne_input = setupPointsStripes(groups, n, sd)
}

let npoints = groups*n

 
let resolution
switch(100*(npoints < 700) + 10*(npoints < 1700) + (npoints >= 1500)) {
  case 110:
    resolution = 'low'
    break
  case 10:
    resolution = 'medium'
    break
  default:
    resolution = 'high'
} 
 
let colorpalette = rnd.chooseOne(ColorPalettes.availablePalettes())
b = Math.floor(100*Math.pow(2, rnd.rUnif(-1, 1)) + .5)/100

window.$fxhashFeatures = {
   "Color palette": ColorPalettes.getPaletteName(colorpalette),
   "Input data": type,
   "Perplexity": perplexity,
   "Noise": sd,
   "Point density": resolution
}

console.log("Color palette:", ColorPalettes.getPaletteName(colorpalette))
console.log("Palette distortion:", b) 
console.log("Input data:", type)
console.log("Number of groups:", groups)
console.log("Number of points / group:", n)
console.log("Point density:", resolution)
console.log("Perplexity:", perplexity)
console.log("Noise:", sd)

let colormap = ColorPalettes.getColormap(colorpalette, b)

let colors = []
for (let i = 0; i < npoints; i++) {
  colors.push(colormap((i-.5)/npoints))
}

let width = 600;
let height = 600;

d3.select("body")
    .append("div")
    .attr("class", "main-container");

const svg = d3.select("div")
    .append("svg")
    .attr("viewBox", [-width/2, -height/2, width, height])
    
svg.append("defs")
    .append("clipPath")
    .attr("id", "svg-frame")
    .append("rect")
    .attr("x", -width/2)
    .attr("y", -height/2)
    .attr("width", width)
    .attr("height", height)

const cells = svg.append("g")
    .attr("clip-path", "url(#svg-frame)")
    .selectAll("path")
    .data(colors)
    .join("path")
        .attr("fill",  (d, i) => d)
        .attr("stroke", (d, i) => d)
        .attr("stroke-width", "1")

let config = {
  learning_rate: 10, // learning rate (10 = default)
  perplexity: perplexity,
  theta: 0.8,
  barnes_hut_cutoff: 4500 // number of datapoints above which Barnes-Hut becomes faster than naive method, depends on value of theta (larger theta: faster computation, less accurate results)
}

let tsne = new TSNE(config, rnd)
tsne.initData(tsne_input)

// #######################################
// various events
let counter = 0
let rendering_interval = setInterval(update, 0)
// run 30 optimization steps before first visualization
for ( ; counter < 30; counter++ ) {
  tsne.takeStep()
}

window.addEventListener('resize', resize)
resize() // call once to make sure image is sized correctly

document.addEventListener('keyup', function (event) {
  // 's' saves to svg, 'p' saves to png
  if (event.key === 's') {
    saveSVG()
  } else if (event.key === 'p') {
    savePNG()
  }
})

// #######################################

function resize () {
  let width = window.innerWidth
  if (window.innerHeight < window.innerWidth) {
    width = window.innerHeight
  }
  
  d3.select(".main-container")
    .style("width", `${width}px`)
}

function update () {
  if (counter >= max_iter) {
    clearInterval(rendering_interval)
    console.log("Gradient descent completed")
    fxpreview()
  }
  counter += 1
  tsne.takeStep() // move t-SNE solution one step forward
  let tsne_output = scaleCoords(tsne.solution) 
  let voronoi = d3.Delaunay
    .from(tsne_output, d => d.x*width/2, d => d.y*width/2)
    .voronoi([-width/2, -height/2, width, height])

  svg.selectAll("path")
    .data(tsne_output)
    .attr("d", (d, i) => voronoi.renderCell(i))
}

// save the current image as an svg
function saveSVG () {
  console.log("Save to svg")
  // get svg source as URL
  let url = getSVGSource()

  // create link, click, and remove
  let el = document.createElement("a")
	el.setAttribute("href", url)
	el.setAttribute("download", `sneronoi_${fxhash}.svg`)
	document.body.appendChild(el)
 	el.click()
	el.remove()
}

// save the current image as a png
function savePNG () {
  console.log("Save to png")
  let size = 4000; // width/height of image


  // get svg source as URL
  let url = getSVGSource()
  
  let img = new Image() // this will hold the svg image

  // we render the svg as a bitmap onto the canvas
  let canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  let context = canvas.getContext("2d")

  img.onload = () => {
    // render the svg image onto the canvas
    context.drawImage(img, 0, 0, size, size)
    // convert to binary blob and save
    canvas.toBlob((blob) => {
      let el = document.createElement("a")
      let url = URL.createObjectURL(blob)
      el.setAttribute("href", url)
	    el.setAttribute("download", `sneronoi_${fxhash}.png`)
	    document.body.appendChild(el)
 	    el.click()
	    el.remove()
    })
  }
    
  img.src = getSVGSource()
}

// turn the current svg image into a URI to save or render as image
function getSVGSource () {
  let serializer = new XMLSerializer()
  let source = serializer.serializeToString(svg.node())

  // add name spaces (these are usually missing in d3)
  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"')
  }
  if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"')
  }
  //add xml declaration
  source = '<?xml version="1.0" standalone="no"?>\n' + source

  //convert svg source to URI data scheme.
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source)
}

function scaleCoords (data) {
  let x_max = Number.MIN_VALUE  
  let y_max = Number.MIN_VALUE  
  let x_min = Number.MAX_VALUE  
  let y_min = Number.MAX_VALUE
  
  for (let {x: x, y: y} of data) {
    if (x > x_max) {
      x_max = x
    }
    if (x < x_min) {
      x_min = x
    }
    if (y > y_max) {
      y_max = y
    }
    if (y < y_min) {
      y_min = y
    }
  }
  
  let x_range = x_max - x_min
  let y_range = y_max - y_min
  
  let out = new Array(data.length)
  for (let i=0; i<data.length; i++) {
    out[i] = new Point(
      2*(data[i].x - x_min)/x_range - 1,
      2*(data[i].y - y_min)/y_range - 1
    )
  }
  return out;
}

function setupPointsStripes(groups = 5, n = 100, sd = 0.0) {
  let points = []
  
  for (let i = 0; i < groups; i++) {
    for (let j = 0; j < n; j++) {
      points.push(new Point(10*j/n + rnd.rNorm(0, sd), i + rnd.rNorm(0, sd)))
    }
  }
  return points
}


function setupPointsSpiral(groups = 5, n = 100, sd = .015, alpha = 2.5, from = 3, to = 5) {
  let points = []
  
  for (let i = 0; i < groups; i++) {
    for (let j = 0; j < n; j++) {
      let t = Math.PI * (from + (j / (n-1))*(to - from))
      let angle = 2 * Math.PI * (i / groups)
      let C = Math.pow(Math.PI * to, alpha) // max(t^alpha)
      let x = Math.pow(t, alpha) * Math.sin(t + angle) / C + rnd.rNorm(0, sd)
      let y = Math.pow(t, alpha) * Math.cos(t + angle) / C + rnd.rNorm(0, sd)
      points.push(new Point(x, y))
    }
  }
  return points
}
