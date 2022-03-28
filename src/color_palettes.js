const chroma = require('./chroma.js')

module.exports = class ColorPalettes {
  static availablePalettes() {
    return ['beach', 'city', 'dark_nebula', 'forest', 'glacier', 'monochrome', 'slot_canyon', 'slot_canyon2', 'succulents', 'sunset', 'wildflowers']
  }
  
  static getPaletteName(palette) {
    return palette_names[palette]
  }
  
  static getColormap(palette) {
    let f = function(x, b = 1) {
      let scale = chroma.scale(palettes[palette]).mode('lab')
      return scale(Math.pow(x, b)).hex()
    }
    return f
  }
}

let palettes = {
  beach: ["#A56E54", "#C59278", "#F1CCA7", "#F1E9BB", "#EDEBEC", "#BECFD1", "#67A1A6", "#0A6D79", "#004D55"],
  city: ["#FFFDF1", "#A49072", "#6A4914", "#150B00", "#000102", "#080D1A", "#32363E", "#79797B", "#E8E1A6"],
  dark_nebula: ['#FEEBFF', '#FAB9FC', '#A970AC', '#4A304B', "#303030", "#202020", "#101010", "#000000", "#101010", "#202020", "#303030", '#FFF324', '#FFFDE8', '#FFF324', "#303030", "#202020", "#101010", "#000000", "#000000", "#101010", "#202020", "#303030", '#556D86', '#8BB4E0', '#C3DDFB', '#E8F2FF'],
  forest: ["#E9E5CC", "#F1E56B", "#A3A000", "#757717", "#48490D", "#333200", "#1B1303"],
  glacier: ["#1E2422", "#7A8C99", "#C4D2E0", "#E2F2FD", "#9DD0EA", "#4E9BC8", "#025B95"],
  monochrome: ["#ffffff", "#aaaaaa", "#555555", "#000000", "#555555", "#aaaaaa", "#ffffff"],
  slot_canyon: ["#200A05", "#470A07", "#821903", "#C13705", "#DB6703", "#FCAF5B", "#FEEDCE"],
  slot_canyon2: ["#D9E9F6", "#7B99B1", "#34404F", "#050507", "#3D200E", "#943A07", "#F76504", "#FFD207", "#FBFDA1"],
  succulents: ["#A8D2E9", "#388DBA", "#054462", "#010101", "#88AD59", "#EEECC8"],
  sunset: ["#211E49", "#43294B", "#6A3446", "#953D45", "#BB4F45", "#E07953", "#FFC456", "#FEFDAB", "#FEFEFE"],
  wildflowers: ["#040C28", "#0A0B61", "#29238F", "#545CC7", "#999FF3", "#E3EAF1", "#E9E486", "#DA8D04", "#A9120F"]
}


let palette_names = {
  beach: 'Beach',
  city: 'City',
  dark_nebula: 'Dark Nebula',
  forest: 'Forest',
  glacier: 'Glacier',
  monochrome: 'Monochrome',
  slot_canyon: 'Slot Canyon',
  slot_canyon2: 'Slot Canyon 2',
  succulents: 'Succulents',
  sunset: 'Sunset',
  wildflowers: 'Wildflowers'
}