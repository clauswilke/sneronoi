/**
 * Simple 2d point class.
 */
module.exports = class Point {
  constructor (x, y) {
    this.x = x
    this.y = y
  }
  
  /**
   * Update the `x` and `y` coordinate of the point.
   */
  set (x, y) {
    this.x = x
    this.y = y
  }
  
  /**
   * Calculate the squared Euclidean distance to another point `p`.
   */
  distanceToPoint (p) {
  	let dx = p.x - this.x
    let dy = p.y - this.y
    return dx * dx + dy * dy
  }

  /**
   * Calculate the squared Euclidean distance to a position indicated
   * by `x` and `y`.
   */
  distanceToPosition (x, y) {
  	let dx = x - this.x
    let dy = y - this.y
    return dx * dx + dy * dy
  }

  
  /**
   * Add coordinates of point p to the current point coordinates.
   * Modifies the current point.
   */
  addInPlace (p) {
  	this.x += p.x
  	this.y += p.y
  }

  /**
   * Add coordinates of point p to the current point coordinates.
   * Returns a new point.
   */
  add (p) {
  	return new Point(this.x + p.x, this.y + p.y)
  }

  /**
   * Subtract coordinates of point p from the current point coordinates.
   * Modifies the current point.
   */
  subtractInPlace (p) {
  	this.x -= p.x
  	this.y -= p.y
  }

  /**
   * Subtract coordinates of point p from the current point coordinates.
   * Returns a new point.
   */
  subtract (p) {
  	return new Point(this.x - p.x, this.y - p.y)
  }

  /**
   * Divide both point coordinates by a scalar `s`.
   * Modifies the current point.
   */
  divInPlace (s) {
  	this.x /= s
  	this.y /= s
  }

  /**
   * Divide both point coordinates by a scalar `s`.
   * Returns a new point.
   */
  div (s) {
  	return new Point(this.x / s, this.y / s)
  }

  /**
   * Multiply both point coordinates by a scalar `s`.
   * Modifies the current point.
   */
  multInPlace (s) {
  	this.x *= s
  	this.y *= s
  }

  /**
   * Multiply both point coordinates by a scalar `s`.
   * Returns a new point.
   */
  mult (s) {
  	return new Point(this.x * s, this.y * s)
  }
  
  /**
   * Returns a copy of the current point
   */
  clone () {
    return new Point(this.x, this.y)
  }
  
  /**
   * Tests whether the given point exactly equals the current point
   */
  equals (p) {
    if (p === undefined) {
      return false
    }
    return (p.x === this.x) && (p.y === this.y)
  }
}
