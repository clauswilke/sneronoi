const Point = require("./point.js")

/**
 * A 2d quadtree. See: https://en.wikipedia.org/wiki/Quadtree
 */
module.exports = class Quadtree {
  /**
   * Construct a new quadtree node, centered at location (x, y) and with
   * given half-dimension (used along both x and y). 
   */
  constructor (x, y, half_dimension) {
    this.center = new Point(x, y)
    this.half_dimension = half_dimension
    this.ntotal = 0 // number of points contained in this subtree
    // sum of all points in this node, used to keep track of center of mass
    this.point_sum = new Point(0, 0)
  
    // child point (only for leaf nodes)
    this.point = undefined
    
    // child nodes
    this.top_left = undefined
    this.top_right = undefined
    this.bottom_left = undefined
    this.bottom_right = undefined
  }
  
  /**
   * Tests whether the provided point is enclosed by the boundary
   * represented by this quadtree.
   */
  enclosesPoint (p) {
    if (p.x >= this.center.x - this.half_dimension && 
        p.x < this.center.x + this.half_dimension &&
        p.y >= this.center.y - this.half_dimension && 
        p.y < this.center.y + this.half_dimension) {
      return true
    } else {
      return false
    }
  }
  
  /**
   * Insert a point into the quadtree.
   */
  insert (p) {
    // ignore objects that do not belong in this quad tree
    if (!this.enclosesPoint(p)) {
      return false; // point cannot be added
    }
    
    // if we're empty and haven't subdivided, add point directly
    if (this.top_left === undefined && this.point === undefined) {
      this.point = p
      // update points total and point sum
      this.ntotal += 1
      this.point_sum.addInPlace(p)
      return true
    }
    
    // subdivide if needed and then add the point
    // to whichever node will accept it
    this.subdivide(
      // here we check whether the newly added point exactly equals
      // the currently held point to deal gracefully with this edge case
      p.equals(this.point)
    )
    
    if (this.top_left.insert(p)) {
      this.ntotal += 1 // update points total
      this.point_sum.addInPlace(p)
      return true
    }
    if (this.top_right.insert(p)) {
      this.ntotal += 1 // update points total
      this.point_sum.addInPlace(p)
      return true
    }
    if (this.bottom_left.insert(p)) {
      this.ntotal += 1 // update points total
      this.point_sum.addInPlace(p)
      return true
    }
    if (this.bottom_right.insert(p)) {
      this.ntotal += 1 // update points total
      this.point_sum.addInPlace(p)
      return true
    }

    // otherwise, the point cannot be inserted for some unknown reason
    // (this should never happen)
    return false
  }
  
  /**
   * Subdivide the current quadtree. If quadtree has already subdivided,
   * call will be ignored.
   * 
   * Set `no_move = true` to deal with duplicated points.
   */
  subdivide (no_move = false) {
    // only subdivide if we haven't already
    if (!(this.top_left === undefined)) {
      return
    }
    
    // calculate new half-dimension
    let half_dimension = this.half_dimension / 2
    let x = this.center.x
    let y = this.center.y
    // add new quadtrees
    this.top_left = new Quadtree(x - half_dimension, y - half_dimension, half_dimension)
    this.top_right = new Quadtree(x + half_dimension, y - half_dimension, half_dimension)
    this.bottom_left = new Quadtree(x - half_dimension, y + half_dimension, half_dimension)
    this.bottom_right = new Quadtree(x + half_dimension, y + half_dimension, half_dimension)
    
    // if we currently hold a point, move it into appropriate subtree
    if (this.point === undefined || no_move) {
      return
    } else {
      let p = this.point
      this.point = undefined
      if (this.top_left.insert(p)) {
        return
      }
      if (this.top_right.insert(p)) {
        return
      }
      if (this.bottom_left.insert(p)) {
        return
      }
      if (this.bottom_right.insert(p)) {
        return
      }
      // for some reason we couldn't move the point, should never happen
      this.point = p
    }
  }
}
