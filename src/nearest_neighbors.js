const Point = require("./point.js")

/**
 * A data structure that takes an array of points and builds a list of nearest
 * neighbors for each point.
 * 
 * The ideal way to implement this is with a vantage-point tree, but for
 * now we just do the naive, all-against-all search. It's fine since
 * we need to do this only once.
 * 
 * Info on vantage-point tree:
 * https://lvdmaaten.github.io/publications/papers/JMLR_2014.pdf
 */
module.exports = class NearestNeighbors {
  /**
   * `points` is an array of `Point` objects, `u` is the number of
   * neighbors to keep.
   */
  constructor (points, u) {
    this.points = points
    this.u = u
    this.n = points.length
    // extract the nearest neighbors
    this.findNeighbors()
    
  }

  findNeighbors() {
    // first we calculate all by all distances, then we prune
    this.neighbors = new Array(this.n)
    for (let i = 0; i < this.n; i++) {
      let row = new Array(this.n)
      for (let j = 0; j < this.n; j++) {
        if (i === j) { // we don't care about distance to itself
          row[j] = {index: j, distance: Number.MAX_VALUE}
        } else {
          row[j] = {index: j, distance: this.points[i].distanceToPoint(this.points[j])}
        }
      }
      row.sort((x, y) => (x.distance - y.distance))
      this.neighbors[i] = row.slice(0, this.u)
    }
  }
  
  /**
   * Returns a nested array holding the list of nearest neighbors for
   * each point.
   */
  getNeighbors() {
    return this.neighbors
  }
}

